from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tifffile


@dataclass(frozen=True)
class RoiCrop:
    roi: int
    file_name: str
    shape: tuple[int, ...]
    x: int | None
    y: int | None
    w: int | None
    h: int | None


@dataclass(frozen=True)
class PositionIndex:
    position: int
    axis_order: str
    time_count: int
    channel_count: int
    z_count: int
    rois: tuple[RoiCrop, ...]


def position_dir(dataset_root: Path, pos: int) -> Path:
    pos_dir = (dataset_root / "roi" / f"Pos{pos}").resolve()
    if not pos_dir.is_dir():
        raise ValueError(f"No ROI directory found for --pos={pos}: {pos_dir}")
    return pos_dir


def _coerce_optional_int(value: object) -> int | None:
    return None if value is None else int(value)


def read_position_index(pos_dir: Path) -> PositionIndex:
    index_path = pos_dir / "index.json"
    if not index_path.is_file():
        raise ValueError(f"Missing ROI index: {index_path}")

    raw = json.loads(index_path.read_text(encoding="utf-8"))
    axis_order = str(raw.get("axisOrder", "")).upper()
    if not axis_order:
        raise ValueError(f"{index_path} is missing axisOrder")

    rois: list[RoiCrop] = []
    for roi_entry in raw.get("rois", []):
        file_name = str(roi_entry["fileName"])
        shape = tuple(int(value) for value in roi_entry["shape"])
        bbox = roi_entry.get("bbox") or {}
        rois.append(
            RoiCrop(
                roi=int(roi_entry["roi"]),
                file_name=file_name,
                shape=shape,
                x=_coerce_optional_int(bbox.get("x")),
                y=_coerce_optional_int(bbox.get("y")),
                w=_coerce_optional_int(bbox.get("w")),
                h=_coerce_optional_int(bbox.get("h")),
            )
        )

    if not rois:
        raise ValueError(f"No ROI entries found in {index_path}")

    return PositionIndex(
        position=int(raw.get("position", 0)),
        axis_order=axis_order,
        time_count=int(raw.get("timeCount", 1)),
        channel_count=int(raw.get("channelCount", 1)),
        z_count=int(raw.get("zCount", 1)),
        rois=tuple(rois),
    )


def validate_channel_index(index: PositionIndex, channel: int) -> None:
    if channel < 0 or channel >= index.channel_count:
        raise ValueError(
            f"--channel must be between 0 and {index.channel_count - 1}, got {channel}"
        )


def default_timeseries_csv_path(
    dataset_root: Path, pos: int, channel: int, output_csv: Path | None
) -> Path:
    csv_path = output_csv or (
        dataset_root / "timeseries" / f"Pos{pos}" / f"Pos{pos}_ch{channel:03d}_timeseries.csv"
    )
    return csv_path.resolve()


def read_roi_stack(roi_path: Path, expected_shape: tuple[int, ...]) -> np.ndarray:
    stack = np.asarray(tifffile.imread(roi_path))
    if stack.shape != expected_shape:
        expected_size = int(np.prod(expected_shape, dtype=np.int64))
        if stack.size != expected_size:
            raise ValueError(
                f"{roi_path} shape mismatch: expected {expected_shape}, got {stack.shape}"
            )
        stack = stack.reshape(expected_shape)
    return stack


def roi_frame_2d(
    stack: np.ndarray, axis_order: str, *, timepoint: int, channel: int, z_index: int = 0
) -> np.ndarray:
    if len(axis_order) != stack.ndim:
        raise ValueError(
            f"Axis order {axis_order!r} does not match ROI stack ndim={stack.ndim}"
        )

    slicer: list[int | slice] = []
    for axis, size in zip(axis_order, stack.shape):
        if axis == "T":
            if timepoint >= size:
                raise ValueError(f"Time index {timepoint} out of range for axis size {size}")
            slicer.append(timepoint)
        elif axis == "C":
            if channel >= size:
                raise ValueError(f"Channel index {channel} out of range for axis size {size}")
            slicer.append(channel)
        elif axis == "Z":
            if z_index >= size:
                raise ValueError(f"Z index {z_index} out of range for axis size {size}")
            slicer.append(z_index)
        elif axis in {"Y", "X"}:
            slicer.append(slice(None))
        else:
            if size != 1:
                raise ValueError(
                    f"Unsupported non-singleton axis {axis!r} in ROI stack with shape {stack.shape}"
                )
            slicer.append(0)

    frame = np.asarray(stack[tuple(slicer)])
    if frame.ndim != 2:
        raise ValueError(f"Expected a 2D ROI frame, got shape={frame.shape}")
    return frame

