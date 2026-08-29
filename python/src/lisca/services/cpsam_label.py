"""Pseudo-label ROI brightfield frames with Cellpose v4 cpsam (binary fg/bg)."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from lisca.core.frame_normalize import normalize_frame_to_uint8, save_grayscale_png
from lisca.core.mask_io import write_mask_png
from lisca.core.roi_stack import load_roi_stack, roi_frame_2d
from lisca.core.workspace import list_align_positions, load_position_index, roi_tiff_path


@dataclass(frozen=True)
class LabelCpsamOptions:
    workspace: Path
    output: Path
    channel: int = 0
    z: int = 0
    time_stride: int = 20
    times: list[int] | None = None
    positions: list[int] | None = None
    force: bool = False
    preview_count: int = 8
    batch_size: int = 8


def _list_roi_positions(workspace: Path) -> list[int]:
    roi_dir = workspace / "roi"
    if not roi_dir.is_dir():
        return []
    positions: list[int] = []
    for path in sorted(roi_dir.glob("Pos*")):
        if not path.is_dir():
            continue
        suffix = path.name.removeprefix("Pos")
        if suffix.isdigit():
            positions.append(int(suffix))
    return positions


def resolve_positions(workspace: Path, positions: list[int] | None) -> list[int]:
    if positions:
        return sorted(set(positions))
    found = _list_roi_positions(workspace)
    if found:
        return found
    return list_align_positions(workspace)


def resolve_times(time_count: int, options: LabelCpsamOptions) -> list[int]:
    if options.times is not None:
        times = sorted({t for t in options.times if 0 <= t < time_count})
        if not times:
            msg = f"no valid --times in range [0, {time_count})"
            raise ValueError(msg)
        return times
    stride = max(1, options.time_stride)
    return list(range(0, time_count, stride))


@lru_cache(maxsize=1)
def _cellpose_model() -> Any:
    import torch
    from cellpose import models

    device_name = "cuda" if torch.cuda.is_available() else "cpu"
    return models.CellposeModel(
        device=torch.device(device_name),
        pretrained_model="cpsam",
        use_bfloat16=device_name != "cpu",
    )


def _ensure_2d_frame(frame: np.ndarray) -> np.ndarray:
    image = np.asarray(frame, dtype=np.float32)
    if image.ndim != 2:
        msg = f"expected 2D frame, got shape={image.shape}"
        raise ValueError(msg)
    return image


def _coerce_labels_to_frame(labels: np.ndarray, frame_shape: tuple[int, int]) -> np.ndarray:
    """Match cellpose output to (H, W), including singleton axes it may squeeze."""
    label_arr = np.asarray(labels, dtype=np.int32)
    height, width = frame_shape
    if label_arr.shape == (height, width):
        return label_arr
    if label_arr.size == height * width:
        return label_arr.reshape(height, width)
    # Degenerate crops (H=1 or W=1): treat as empty when model collapses them.
    if min(height, width) == 1:
        return np.zeros((height, width), dtype=np.int32)
    msg = f"Cellpose mask shape {label_arr.shape} != frame shape {frame_shape}"
    raise ValueError(msg)


def _pad_for_cellpose(frame: np.ndarray, min_size: int = 32) -> tuple[np.ndarray, tuple[int, int]]:
    """Pad tiny/narrow frames so cpsam does not collapse a spatial axis."""
    height, width = frame.shape
    pad_h = max(0, min_size - height)
    pad_w = max(0, min_size - width)
    if pad_h == 0 and pad_w == 0:
        return frame, (height, width)
    padded = np.pad(
        frame,
        ((0, pad_h), (0, pad_w)),
        mode="edge",
    )
    return padded, (height, width)


def segment_bf_binary(frame: np.ndarray) -> np.ndarray:
    """Run cpsam on one BF frame; return uint8 binary mask (0/1)."""
    return segment_bf_binary_batch([frame], batch_size=1)[0]


def segment_bf_binary_batch(frames: list[np.ndarray], *, batch_size: int = 8) -> list[np.ndarray]:
    """Segment a list of BF frames; returns one binary mask per frame."""
    if not frames:
        return []
    model = _cellpose_model()
    results: list[np.ndarray] = []
    size = max(1, batch_size)
    for start in range(0, len(frames), size):
        raw_chunk = [_ensure_2d_frame(frame) for frame in frames[start : start + size]]
        originals = [frame.shape for frame in raw_chunk]
        chunk = []
        for frame in raw_chunk:
            padded, _orig = _pad_for_cellpose(frame)
            chunk.append(padded)
        masks, _flows, _styles = model.eval(chunk, batch_size=len(chunk))
        if not isinstance(masks, list):
            array = np.asarray(masks, dtype=np.int32)
            if array.ndim == 3:
                masks = [array[i] for i in range(array.shape[0])]
            else:
                masks = [array]
        for (height, width), labels in zip(originals, masks, strict=True):
            label_arr = np.asarray(labels, dtype=np.int32)
            # Crop away padding if model returned full padded plane.
            if label_arr.ndim == 2 and (
                label_arr.shape[0] >= height and label_arr.shape[1] >= width
            ):
                label_arr = label_arr[:height, :width]
            label_arr = _coerce_labels_to_frame(label_arr, (height, width))
            results.append((label_arr > 0).astype(np.uint8))
    return results


def _sample_key(position: int, roi: int, timepoint: int) -> str:
    return f"Pos{position}_Roi{roi}_t{timepoint:04d}"


def _sample_paths(output: Path, key: str) -> tuple[Path, Path]:
    image_path = output / "images" / f"{key}.png"
    mask_path = output / "masks" / f"{key}.png"
    return image_path, mask_path


def label_cpsam(options: LabelCpsamOptions) -> dict:
    positions = resolve_positions(options.workspace, options.positions)
    if not positions:
        raise ValueError("no ROI positions found in workspace")

    output = options.output
    output.mkdir(parents=True, exist_ok=True)
    (output / "images").mkdir(exist_ok=True)
    (output / "masks").mkdir(exist_ok=True)
    preview_dir = output / "preview"
    preview_dir.mkdir(exist_ok=True)

    samples: list[dict] = []
    labeled = 0
    skipped = 0
    preview_written = 0

    for position in positions:
        index = load_position_index(options.workspace, position)
        times = resolve_times(index.time_count, options)
        for roi_entry in index.rois:
            roi_path = roi_tiff_path(options.workspace, position, roi_entry.file_name)
            if not roi_path.is_file():
                msg = f"missing ROI TIFF: {roi_path}"
                raise FileNotFoundError(msg)

            pending_times: list[int] = []
            for timepoint in times:
                key = _sample_key(position, roi_entry.roi, timepoint)
                image_path, mask_path = _sample_paths(output, key)
                if mask_path.is_file() and image_path.is_file() and not options.force:
                    skipped += 1
                    samples.append(
                        {
                            "key": key,
                            "position": position,
                            "roi": roi_entry.roi,
                            "time": timepoint,
                            "image": str(image_path.relative_to(output)),
                            "mask": str(mask_path.relative_to(output)),
                            "height": int(roi_entry.shape[3]),
                            "width": int(roi_entry.shape[4]),
                            "cached": True,
                        }
                    )
                    continue
                pending_times.append(timepoint)

            if not pending_times:
                continue

            stack = load_roi_stack(roi_path, roi_entry.shape)
            pending_frames = [
                roi_frame_2d(
                    stack,
                    index.axis_order,
                    timepoint,
                    options.channel,
                    options.z,
                )
                for timepoint in pending_times
            ]

            binary_masks = segment_bf_binary_batch(
                pending_frames, batch_size=options.batch_size
            )
            for timepoint, frame, binary in zip(
                pending_times, pending_frames, binary_masks, strict=True
            ):
                key = _sample_key(position, roi_entry.roi, timepoint)
                image_path, mask_path = _sample_paths(output, key)
                image_u8 = normalize_frame_to_uint8(frame)
                save_grayscale_png(str(image_path), image_u8)
                write_mask_png(binary, mask_path)
                labeled += 1
                samples.append(
                    {
                        "key": key,
                        "position": position,
                        "roi": roi_entry.roi,
                        "time": timepoint,
                        "image": str(image_path.relative_to(output)),
                        "mask": str(mask_path.relative_to(output)),
                        "height": int(binary.shape[0]),
                        "width": int(binary.shape[1]),
                        "fg_fraction": float(binary.mean()),
                        "cached": False,
                    }
                )
                if preview_written < options.preview_count:
                    _write_preview_overlay(
                        preview_dir / f"{key}.png",
                        image_u8,
                        binary,
                    )
                    preview_written += 1

    samples_path = output / "samples.jsonl"
    with samples_path.open("w", encoding="utf-8") as handle:
        for sample in samples:
            handle.write(json.dumps(sample) + "\n")

    manifest = {
        "created_at": datetime.now(UTC).isoformat(),
        "workspace": str(options.workspace),
        "output": str(output),
        "options": {
            **asdict(options),
            "workspace": str(options.workspace),
            "output": str(output),
            "positions": positions,
        },
        "counts": {
            "positions": len(positions),
            "samples": len(samples),
            "labeled": labeled,
            "skipped_cached": skipped,
            "preview": preview_written,
        },
        "teacher": {
            "name": "cellpose",
            "pretrained_model": "cpsam",
            "mask_semantics": "binary_fg_from_instance_labels",
        },
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, default=str), encoding="utf-8"
    )
    return manifest


def _write_preview_overlay(path: Path, image_u8: np.ndarray, binary: np.ndarray) -> None:
    from PIL import Image

    path.parent.mkdir(parents=True, exist_ok=True)
    base = np.stack([image_u8, image_u8, image_u8], axis=-1)
    overlay = base.copy()
    edge = _mask_boundary(binary > 0)
    overlay[binary > 0] = (
        0.65 * overlay[binary > 0] + np.array([0, 180, 80], dtype=np.float64) * 0.35
    ).astype(np.uint8)
    overlay[edge] = np.array([0, 255, 80], dtype=np.uint8)
    Image.fromarray(overlay, mode="RGB").save(path)


def _mask_boundary(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask.astype(bool), 1, mode="constant", constant_values=False)
    eroded = (
        padded[1:-1, 1:-1]
        & padded[:-2, 1:-1]
        & padded[2:, 1:-1]
        & padded[1:-1, :-2]
        & padded[1:-1, 2:]
    )
    return mask.astype(bool) & ~eroded
