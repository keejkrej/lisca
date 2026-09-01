"""Build train/val fg/bg pairs from cpsam label output (position-held-out split)."""

from __future__ import annotations

import json
import shutil
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

from lisca.core.mask_io import read_mask_png, write_mask_png
from lisca.core.frame_normalize import save_grayscale_png
from PIL import Image


@dataclass(frozen=True)
class CreateGeneExpressionSegDatasetOptions:
    labels: Path
    output: Path
    val_fraction: float = 0.15
    val_positions: list[int] | None = None
    seed: int = 42
    min_fg_fraction: float = 0.0
    max_fg_fraction: float = 1.0


def _load_samples(labels: Path) -> list[dict]:
    samples_path = labels / "samples.jsonl"
    if not samples_path.is_file():
        msg = f"missing samples.jsonl under {labels}"
        raise FileNotFoundError(msg)
    samples: list[dict] = []
    for line in samples_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        samples.append(json.loads(line))
    if not samples:
        raise ValueError(f"no samples in {samples_path}")
    return samples


def _choose_val_positions(
    positions: list[int],
    *,
    val_fraction: float,
    val_positions: list[int] | None,
    seed: int,
) -> set[int]:
    if val_positions:
        return set(val_positions)
    if not positions:
        return set()
    ordered = sorted(positions)
    import random

    rng = random.Random(seed)
    shuffled = ordered[:]
    rng.shuffle(shuffled)
    n_val = max(1, int(round(len(shuffled) * val_fraction)))
    n_val = min(n_val, max(1, len(shuffled) - 1)) if len(shuffled) > 1 else 1
    return set(shuffled[:n_val])


def _assign_splits(
    samples: list[dict],
    *,
    val_fraction: float,
    val_positions: list[int] | None,
    seed: int,
) -> dict[str, str]:
    """Map sample key → split. Prefer position hold-out; fall back to ROI hold-out."""
    positions = sorted({int(sample["position"]) for sample in samples})
    key_to_split: dict[str, str] = {}

    if len(positions) >= 2 and not val_positions:
        held = _choose_val_positions(
            positions,
            val_fraction=val_fraction,
            val_positions=None,
            seed=seed,
        )
        for sample in samples:
            key_to_split[sample["key"]] = (
                "val" if int(sample["position"]) in held else "train"
            )
        return key_to_split

    if val_positions is not None and len(positions) >= 2:
        held = set(val_positions)
        for sample in samples:
            key_to_split[sample["key"]] = (
                "val" if int(sample["position"]) in held else "train"
            )
        # If user put every position in val, fall through to ROI split.
        if any(split == "train" for split in key_to_split.values()):
            return key_to_split

    # Single position (or all positions marked val): hold out ROIs.
    import random

    rois = sorted({(int(s["position"]), int(s["roi"])) for s in samples})
    rng = random.Random(seed)
    shuffled = rois[:]
    rng.shuffle(shuffled)
    n_val = max(1, int(round(len(shuffled) * val_fraction)))
    if len(shuffled) > 1:
        n_val = min(n_val, len(shuffled) - 1)
    val_rois = set(shuffled[:n_val])
    for sample in samples:
        key = (int(sample["position"]), int(sample["roi"]))
        key_to_split[sample["key"]] = "val" if key in val_rois else "train"
    return key_to_split


def create_gene_expression_seg_dataset(
    options: CreateGeneExpressionSegDatasetOptions,
) -> dict:
    samples = _load_samples(options.labels)
    key_to_split = _assign_splits(
        samples,
        val_fraction=options.val_fraction,
        val_positions=options.val_positions,
        seed=options.seed,
    )
    val_positions = sorted(
        {
            int(sample["position"])
            for sample in samples
            if key_to_split.get(sample["key"]) == "val"
        }
    )

    output = options.output
    if output.exists():
        shutil.rmtree(output)
    for split in ("train", "val"):
        (output / split / "images").mkdir(parents=True)
        (output / split / "masks").mkdir(parents=True)

    kept: list[dict] = []
    dropped = 0
    for sample in samples:
        position = int(sample["position"])
        split = key_to_split.get(sample["key"], "train")
        image_src = options.labels / sample["image"]
        mask_src = options.labels / sample["mask"]
        if not image_src.is_file() or not mask_src.is_file():
            dropped += 1
            continue
        mask = read_mask_png(mask_src)
        fg = float(mask.mean())
        if fg < options.min_fg_fraction or fg > options.max_fg_fraction:
            dropped += 1
            continue
        key = sample["key"]
        image_dst = output / split / "images" / f"{key}.png"
        mask_dst = output / split / "masks" / f"{key}.png"
        shutil.copy2(image_src, image_dst)
        # Normalize mask to 0/255 for training loaders.
        write_mask_png(mask, mask_dst)
        kept.append(
            {
                "key": key,
                "split": split,
                "position": position,
                "roi": int(sample["roi"]),
                "time": int(sample["time"]),
                "image": str(image_dst.relative_to(output)),
                "mask": str(mask_dst.relative_to(output)),
                "fg_fraction": fg,
            }
        )

    if not kept:
        raise ValueError("no samples kept after filtering")

    with (output / "samples.jsonl").open("w", encoding="utf-8") as handle:
        for sample in kept:
            handle.write(json.dumps(sample) + "\n")

    counts = {
        "train": sum(1 for sample in kept if sample["split"] == "train"),
        "val": sum(1 for sample in kept if sample["split"] == "val"),
        "dropped": dropped,
        "positions_train": sorted(
            {s["position"] for s in kept if s["split"] == "train"}
        ),
        "positions_val": sorted({s["position"] for s in kept if s["split"] == "val"}),
    }
    manifest = {
        "created_at": datetime.now(UTC).isoformat(),
        "labels": str(options.labels),
        "output": str(output),
        "options": {
            **asdict(options),
            "labels": str(options.labels),
            "output": str(output),
            "val_positions": sorted(val_positions),
        },
        "counts": counts,
        "task": "binary_semantic_segmentation",
        "classes": {"0": "background", "1": "foreground"},
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def load_dataset_manifest(dataset: Path) -> dict:
    path = dataset / "manifest.json"
    if not path.is_file():
        msg = f"missing manifest.json under {dataset}"
        raise FileNotFoundError(msg)
    return json.loads(path.read_text(encoding="utf-8"))


def load_seg_samples(dataset: Path, *, split: str) -> list[dict]:
    samples_path = dataset / "samples.jsonl"
    if not samples_path.is_file():
        msg = f"missing samples.jsonl under {dataset}"
        raise FileNotFoundError(msg)
    samples: list[dict] = []
    for line in samples_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        sample = json.loads(line)
        if sample.get("split") == split:
            samples.append(sample)
    return samples


def load_image_mask_pair(dataset: Path, sample: dict) -> tuple[Image.Image, Image.Image]:
    image = Image.open(dataset / sample["image"]).convert("L")
    mask = Image.open(dataset / sample["mask"]).convert("L")
    return image, mask
