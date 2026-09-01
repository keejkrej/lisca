from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tifffile
from lisca.core.bbox import workspace_roi_pos_dir
from lisca.core.workspace import load_position_index as lisca_load_position_index


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
    # Source acquisition time indices per T plane (CSV `t`); default 0..time_count-1.
    time_indices: tuple[int, ...]
    rois: tuple[RoiCrop, ...]


_POS_DIR = re.compile(r"^Pos(\d+)$")


def position_dir(dataset_root: Path, pos: int) -> Path:
    pos_dir = workspace_roi_pos_dir(dataset_root, pos)
    if not pos_dir.is_dir():
        raise ValueError(f"No ROI directory found for --pos={pos}: {pos_dir}")
    return pos_dir


def discover_roi_positions(workspace: Path) -> list[int]:
    """Return sorted position numbers from ``roi/PosN/`` via lisca path helpers."""
    roi_root = workspace_roi_pos_dir(workspace, 0).parent
    if not roi_root.is_dir():
        raise ValueError(f"Expected roi/ directory at {roi_root}")
    positions: list[int] = []
    for child in roi_root.iterdir():
        match = _POS_DIR.fullmatch(child.name)
        if match is not None and child.is_dir():
            positions.append(int(match.group(1)))
    if not positions:
        raise ValueError(f"No roi/PosN directories in {roi_root}")
    return sorted(positions)


def _workspace_and_position(pos_dir: Path) -> tuple[Path, int]:
    pos_dir = pos_dir.resolve()
    match = _POS_DIR.fullmatch(pos_dir.name)
    if match is None:
        raise ValueError(f"Expected roi/PosN directory, got {pos_dir}")
    position = int(match.group(1))
    workspace = pos_dir.parent.parent
    expected = workspace_roi_pos_dir(workspace, position)
    if pos_dir != expected:
        raise ValueError(
            f"ROI directory {pos_dir} is not lisca roi/Pos{position} under {workspace}"
        )
    return workspace, position


def _coerce_optional_int(value: object) -> int | None:
    return None if value is None else int(value)


def _bbox_lookup(raw: dict) -> dict[int, dict]:
    lookup: dict[int, dict] = {}
    for roi_entry in raw.get("rois", []):
        if not isinstance(roi_entry, dict):
            continue
        lookup[int(roi_entry["roi"])] = roi_entry.get("bbox") or {}
    return lookup


def _roi_crop_from_entry(
    *,
    roi: int,
    file_name: str,
    shape: tuple[int, ...],
    bbox: dict,
) -> RoiCrop:
    return RoiCrop(
        roi=roi,
        file_name=file_name,
        shape=shape,
        x=_coerce_optional_int(bbox.get("x")),
        y=_coerce_optional_int(bbox.get("y")),
        w=_coerce_optional_int(bbox.get("w")),
        h=_coerce_optional_int(bbox.get("h")),
    )


def _position_index_from_lisca(lisca_index, raw: dict, index_path: Path) -> PositionIndex:
    time_indices = _resolve_time_indices(
        raw.get("timeIndices"), time_count=lisca_index.time_count, index_path=index_path
    )
    bboxes = _bbox_lookup(raw)
    rois = tuple(
        _roi_crop_from_entry(
            roi=entry.roi,
            file_name=entry.file_name,
            shape=tuple(int(value) for value in entry.shape),
            bbox=bboxes.get(entry.roi, {}),
        )
        for entry in lisca_index.rois
    )
    if not rois:
        raise ValueError(f"No ROI entries found in {index_path}")
    return PositionIndex(
        position=int(lisca_index.position),
        axis_order=str(lisca_index.axis_order).upper(),
        time_count=int(lisca_index.time_count),
        channel_count=int(lisca_index.channel_count),
        z_count=int(lisca_index.z_count),
        time_indices=time_indices,
        rois=rois,
    )


def _position_index_from_slim_crop(raw: dict, index_path: Path) -> PositionIndex:
    """Slim ``index.json`` as written by lisca crop (counts + bbox, no per-ROI shape).

    ``lisca.core.workspace.load_position_index`` still requires ``rois[].shape``.
    lisca crop writes ``timeCount`` / ``channelCount`` / ``zCount`` / ``bbox`` /
    optional ``timeIndices`` instead.
    """
    axis_order = str(raw.get("axisOrder", "")).upper()
    if axis_order != "TCZYX":
        raise ValueError(f"{index_path}: unsupported axisOrder {axis_order!r} (expected TCZYX)")

    time_count = int(raw.get("timeCount", 1))
    channel_count = int(raw.get("channelCount", 1))
    z_count = int(raw.get("zCount", 1))
    time_indices = _resolve_time_indices(raw.get("timeIndices"), time_count=time_count, index_path=index_path)

    rois: list[RoiCrop] = []
    for roi_entry in raw.get("rois", []):
        file_name = str(roi_entry["fileName"])
        bbox = roi_entry.get("bbox") or {}
        w = _coerce_optional_int(bbox.get("w"))
        h = _coerce_optional_int(bbox.get("h"))
        if w is None or h is None:
            raise ValueError(f"{index_path}: ROI {roi_entry.get('roi')} missing bbox.w/bbox.h")
        shape = (time_count, channel_count, z_count, h, w)
        rois.append(
            _roi_crop_from_entry(
                roi=int(roi_entry["roi"]),
                file_name=file_name,
                shape=shape,
                bbox=bbox,
            )
        )

    if not rois:
        raise ValueError(f"No ROI entries found in {index_path}")

    return PositionIndex(
        position=int(raw.get("position", 0)),
        axis_order=axis_order,
        time_count=time_count,
        channel_count=channel_count,
        z_count=z_count,
        time_indices=time_indices,
        rois=tuple(rois),
    )


def read_position_index(pos_dir: Path) -> PositionIndex:
    workspace, position = _workspace_and_position(pos_dir)
    pos_dir = workspace_roi_pos_dir(workspace, position)
    index_path = pos_dir / "index.json"
    if not index_path.is_file():
        raise ValueError(f"Missing ROI index: {index_path}")

    raw = json.loads(index_path.read_text(encoding="utf-8"))
    rois_raw = raw.get("rois", [])
    has_legacy_shape = bool(rois_raw) and all(
        isinstance(entry, dict) and "shape" in entry for entry in rois_raw
    )
    if has_legacy_shape:
        return _position_index_from_lisca(
            lisca_load_position_index(workspace, position), raw, index_path
        )
    return _position_index_from_slim_crop(raw, index_path)


def _resolve_time_indices(raw: object, *, time_count: int, index_path: Path) -> tuple[int, ...]:
    if raw is None:
        return tuple(range(time_count))
    if not isinstance(raw, list):
        raise ValueError(f"{index_path}: timeIndices must be an array")
    indices = tuple(int(value) for value in raw)
    if len(indices) != time_count:
        raise ValueError(
            f"{index_path}: timeIndices length {len(indices)} does not match timeCount {time_count}"
        )
    return indices


def validate_channel_index(index: PositionIndex, channel: int) -> None:
    if channel < 0 or channel >= index.channel_count:
        raise ValueError(f"--channel must be between 0 and {index.channel_count - 1}, got {channel}")


def read_roi_stack(roi_path: Path, expected_shape: tuple[int, ...]) -> np.ndarray:
    # key=slice(None) stacks multipage TIFFs; needed when a spatial axis is 1
    # (tifffile may otherwise return only the first page).
    stack = np.asarray(tifffile.imread(roi_path, key=slice(None)))
    if stack.shape != expected_shape:
        expected_size = int(np.prod(expected_shape, dtype=np.int64))
        if stack.size != expected_size:
            raise ValueError(f"{roi_path} shape mismatch: expected {expected_shape}, got {stack.shape}")
        stack = stack.reshape(expected_shape)
    return stack


def roi_frame_2d(
    stack: np.ndarray, axis_order: str, *, timepoint: int, channel: int, z_index: int = 0
) -> np.ndarray:
    if len(axis_order) != stack.ndim:
        raise ValueError(f"Axis order {axis_order!r} does not match ROI stack ndim={stack.ndim}")

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
