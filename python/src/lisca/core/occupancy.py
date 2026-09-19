"""Assay-scoped occupancy prompt pack: accumulating few-shot, no per-user retrain.

Do not retrain Smart exclude per user or lab. On a new assay, bootstrap with
variance-based and/or manual include/exclude. Each manual occupied/empty mark
appends to ``align/occupancy-pack.json`` for that workspace only. There is no
lab-wide or cross-assay memory.

A frozen embedder plus distance-to-prototype scores the rest once the pack
has enough examples (default: ≥2 occupied and ≥2 empty). Until then Smart
exclude stays on the ResNet baseline.

The v0 embedder is a deterministic visual descriptor (min-max crop, 16×16
grid, summary stats). It is not a learned contrastive model. Swap
``OCCUPANCY_EMBEDDER_ID`` later for a ResNet pool vector without changing the
pack file shape.
"""

from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

import numpy as np
from PIL import Image

from lisca.core.paths import occupancy_pack_path

OCCUPANCY_EMBEDDER_ID = "lisca-occupancy-v0"
OCCUPANCY_PACK_VERSION = 1
OCCUPANCY_GRID = 16
OCCUPANCY_DEFAULT_THRESHOLD = 0.0
OCCUPANCY_MIN_OCCUPIED_EXAMPLES = 2
OCCUPANCY_MIN_EMPTY_EXAMPLES = 2
OccupancyLabel = Literal["occupied", "empty"]


def occupancy_embedding_size() -> int:
    return OCCUPANCY_GRID * OCCUPANCY_GRID + 4


def minmax_uint8(values: np.ndarray) -> np.ndarray:
    array = np.asarray(values, dtype=np.float64)
    if array.size == 0:
        return np.zeros(0, dtype=np.uint8)
    minimum = float(array.min())
    maximum = float(array.max())
    if maximum <= minimum:
        return np.zeros(array.shape, dtype=np.uint8)
    scaled = np.rint((array - minimum) / (maximum - minimum) * 255.0)
    return np.clip(scaled, 0, 255).astype(np.uint8)


def resize_nearest(gray: np.ndarray, size: int) -> np.ndarray:
    height, width = gray.shape
    if height <= 0 or width <= 0:
        return np.zeros((size, size), dtype=gray.dtype)
    rows = (np.arange(size) * height / size).astype(np.int64)
    cols = (np.arange(size) * width / size).astype(np.int64)
    rows = np.clip(rows, 0, height - 1)
    cols = np.clip(cols, 0, width - 1)
    return gray[np.ix_(rows, cols)]


def l2_normalize(vector: np.ndarray) -> np.ndarray:
    array = np.asarray(vector, dtype=np.float64).ravel()
    norm = float(np.linalg.norm(array))
    if norm <= 0.0:
        return array
    return array / norm


def embed_occupancy_crop(gray: np.ndarray) -> list[float]:
    """Embed a 2D crop. Values may be any numeric intensity; min-max is applied."""
    array = np.asarray(gray)
    if array.ndim != 2:
        raise ValueError(f"Expected 2D occupancy crop, got shape {array.shape}")
    uint8 = minmax_uint8(array)
    small = resize_nearest(uint8, OCCUPANCY_GRID).astype(np.float64) / 255.0
    flat = small.ravel()
    mean = float(flat.mean()) if flat.size else 0.0
    std = float(flat.std()) if flat.size else 0.0
    p90 = float(np.quantile(flat, 0.9)) if flat.size else 0.0
    dx = float(np.abs(np.diff(small, axis=1)).mean()) if small.shape[1] > 1 else 0.0
    dy = float(np.abs(np.diff(small, axis=0)).mean()) if small.shape[0] > 1 else 0.0
    vector = np.concatenate([flat, np.array([mean, std, p90, 0.5 * (dx + dy)])])
    return l2_normalize(vector).tolist()


def embed_occupancy_image(path: Path) -> list[float]:
    with Image.open(path) as image:
        gray = np.asarray(image.convert("L"))
    return embed_occupancy_crop(gray)


def _mean_prototype(embeddings: Sequence[Sequence[float]]) -> np.ndarray:
    stacked = np.asarray(list(embeddings), dtype=np.float64)
    if stacked.size == 0:
        raise ValueError("prototype requires at least one embedding")
    return l2_normalize(stacked.mean(axis=0))


def empty_occupancy_pack(
    *,
    threshold: float = OCCUPANCY_DEFAULT_THRESHOLD,
) -> dict[str, Any]:
    return {
        "version": OCCUPANCY_PACK_VERSION,
        "embedder": OCCUPANCY_EMBEDDER_ID,
        "threshold": float(threshold),
        "examples": [],
    }


def pack_counts(pack: dict[str, Any]) -> tuple[int, int]:
    occupied = 0
    empty = 0
    for example in pack.get("examples", []):
        label = str(example.get("label"))
        if label == "occupied":
            occupied += 1
        elif label == "empty":
            empty += 1
    return occupied, empty


def pack_has_both_classes(pack: dict[str, Any]) -> bool:
    occupied, empty = pack_counts(pack)
    return occupied > 0 and empty > 0


def pack_is_ready(
    pack: dict[str, Any],
    *,
    min_occupied: int = OCCUPANCY_MIN_OCCUPIED_EXAMPLES,
    min_empty: int = OCCUPANCY_MIN_EMPTY_EXAMPLES,
) -> bool:
    occupied, empty = pack_counts(pack)
    return occupied >= min_occupied and empty >= min_empty


def pack_gate_message(
    pack: dict[str, Any] | None,
    *,
    min_occupied: int = OCCUPANCY_MIN_OCCUPIED_EXAMPLES,
    min_empty: int = OCCUPANCY_MIN_EMPTY_EXAMPLES,
) -> str:
    if pack is None:
        occupied, empty = 0, 0
    else:
        occupied, empty = pack_counts(pack)
    if occupied >= min_occupied and empty >= min_empty:
        return f"Prompt pack ready ({occupied} occupied, {empty} empty)."
    need_occupied = max(0, min_occupied - occupied)
    need_empty = max(0, min_empty - empty)
    needed: list[str] = []
    if need_occupied:
        needed.append(f"{need_occupied} more occupied")
    if need_empty:
        needed.append(f"{need_empty} more empty")
    return (
        "Not ready yet — need "
        + " and ".join(needed)
        + f" examples (have {occupied} occupied, {empty} empty). "
        + "Using ResNet until then."
    )


def _example_key(example: dict[str, Any]) -> tuple[Any, int, int] | None:
    if example.get("i") is None or example.get("j") is None:
        return None
    return (example.get("pos"), int(example["i"]), int(example["j"]))


def merge_occupancy_packs(
    base: dict[str, Any], extra: dict[str, Any]
) -> dict[str, Any]:
    """Append extra examples. A later (pos, i, j) correction replaces earlier."""
    merged = empty_occupancy_pack(
        threshold=float(
            extra.get("threshold", base.get("threshold", OCCUPANCY_DEFAULT_THRESHOLD))
        )
    )
    keyed: dict[tuple[Any, int, int], dict[str, Any]] = {}
    anonymous: list[dict[str, Any]] = []
    for example in list(base.get("examples", [])) + list(extra.get("examples", [])):
        key = _example_key(example)
        if key is None:
            anonymous.append(dict(example))
        else:
            keyed[key] = dict(example)
    merged["examples"] = anonymous + list(keyed.values())
    if extra.get("embedder"):
        merged["embedder"] = extra["embedder"]
    elif base.get("embedder"):
        merged["embedder"] = base["embedder"]
    return merged


def build_occupancy_pack(
    occupied: Sequence[Sequence[float]],
    empty: Sequence[Sequence[float]],
    *,
    threshold: float = OCCUPANCY_DEFAULT_THRESHOLD,
    occupied_meta: Sequence[dict[str, Any]] | None = None,
    empty_meta: Sequence[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    examples: list[dict[str, Any]] = []
    for index, embedding in enumerate(occupied):
        example: dict[str, Any] = {
            "label": "occupied",
            "embedding": [float(v) for v in embedding],
        }
        if occupied_meta is not None and index < len(occupied_meta):
            example.update(occupied_meta[index])
        examples.append(example)
    for index, embedding in enumerate(empty):
        example = {"label": "empty", "embedding": [float(v) for v in embedding]}
        if empty_meta is not None and index < len(empty_meta):
            example.update(empty_meta[index])
        examples.append(example)
    return {
        "version": OCCUPANCY_PACK_VERSION,
        "embedder": OCCUPANCY_EMBEDDER_ID,
        "threshold": float(threshold),
        "examples": examples,
    }


def occupancy_exclude_score(
    embedding: Sequence[float],
    occupied_prototype: Sequence[float],
    empty_prototype: Sequence[float],
) -> float:
    query = l2_normalize(np.asarray(embedding, dtype=np.float64))
    occupied = l2_normalize(np.asarray(occupied_prototype, dtype=np.float64))
    empty = l2_normalize(np.asarray(empty_prototype, dtype=np.float64))
    return float(np.dot(query, empty) - np.dot(query, occupied))


def score_embedding_against_pack(
    embedding: Sequence[float], pack: dict[str, Any]
) -> float:
    occupied = [
        example["embedding"]
        for example in pack.get("examples", [])
        if example.get("label") == "occupied"
    ]
    empty = [
        example["embedding"]
        for example in pack.get("examples", [])
        if example.get("label") == "empty"
    ]
    if not occupied or not empty:
        raise ValueError("prompt pack needs occupied and empty embeddings")
    return occupancy_exclude_score(
        embedding,
        _mean_prototype(occupied),
        _mean_prototype(empty),
    )


def should_exclude_score(score: float, pack: dict[str, Any] | None = None) -> bool:
    threshold = OCCUPANCY_DEFAULT_THRESHOLD
    if pack is not None and pack.get("threshold") is not None:
        threshold = float(pack["threshold"])
    return score >= threshold


def load_occupancy_pack(workspace: Path) -> dict[str, Any] | None:
    path = occupancy_pack_path(workspace)
    if not path.is_file():
        return None
    import json

    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: occupancy pack must be a JSON object")
    return raw


def save_occupancy_pack(workspace: Path, pack: dict[str, Any]) -> Path:
    import json

    path = occupancy_pack_path(workspace)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(pack, indent=2) + "\n", encoding="utf-8")
    return path


def append_occupancy_examples(
    workspace: Path,
    occupied: Sequence[Sequence[float]] = (),
    empty: Sequence[Sequence[float]] = (),
    *,
    occupied_meta: Sequence[dict[str, Any]] | None = None,
    empty_meta: Sequence[dict[str, Any]] | None = None,
    threshold: float = OCCUPANCY_DEFAULT_THRESHOLD,
) -> dict[str, Any]:
    extra = build_occupancy_pack(
        occupied,
        empty,
        threshold=threshold,
        occupied_meta=occupied_meta,
        empty_meta=empty_meta,
    )
    base = load_occupancy_pack(workspace) or empty_occupancy_pack(threshold=threshold)
    merged = merge_occupancy_packs(base, extra)
    save_occupancy_pack(workspace, merged)
    return merged
