from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tifffile


@dataclass
class RoiStack:
    data: np.ndarray
    shape: tuple[int, int, int, int, int]


def load_roi_stack(path: Path, expected_shape: tuple[int, int, int, int, int]) -> RoiStack:
    pages = tifffile.imread(path, key=slice(None))
    if pages.ndim == 2:
        pages = pages[np.newaxis, ...]
    page_count = int(np.prod(expected_shape[:3]))
    plane_size = expected_shape[3] * expected_shape[4]
    if pages.shape[0] != page_count:
        msg = f"{path} page count mismatch: expected {page_count}, got {pages.shape[0]}"
        raise ValueError(msg)

    stacked = np.zeros((page_count, plane_size), dtype=np.float64)
    for page_index, page in enumerate(pages):
        flat = np.asarray(page, dtype=np.float64).reshape(-1)
        if flat.size != plane_size:
            msg = f"{path} page {page_index} size mismatch"
            raise ValueError(msg)
        stacked[page_index] = flat

    return RoiStack(data=stacked.reshape(expected_shape), shape=expected_shape)


def roi_frame_2d(
    stack: RoiStack,
    axis_order: str,
    timepoint: int,
    channel: int,
    z_index: int,
) -> np.ndarray:
    order = axis_order.upper()
    if len(order) != len(stack.shape):
        msg = f"Axis order {order!r} does not match ROI stack ndim={len(stack.shape)}"
        raise ValueError(msg)

    axis_map = {axis: index for index, axis in enumerate(order)}
    y_axis = axis_map.get("Y")
    x_axis = axis_map.get("X")
    if y_axis is None or x_axis is None:
        raise ValueError("missing X or Y axis in ROI stack")

    indices: list[int | None] = [0] * len(stack.shape)
    for axis_index, axis in enumerate(order):
        size = stack.shape[axis_index]
        if axis == "T":
            if timepoint >= size:
                raise ValueError(f"Time index {timepoint} out of range for axis size {size}")
            indices[axis_index] = timepoint
        elif axis == "C":
            if channel >= size:
                raise ValueError(
                    f"Channel index {channel} out of range for axis size {size}"
                )
            indices[axis_index] = channel
        elif axis == "Z":
            if z_index >= size:
                raise ValueError(f"Z index {z_index} out of range for axis size {size}")
            indices[axis_index] = z_index
        elif axis in ("Y", "X"):
            indices[axis_index] = None
        elif size != 1:
            raise ValueError(
                f"Unsupported non-singleton axis {axis!r} in ROI stack with shape {stack.shape}"
            )
        else:
            indices[axis_index] = 0

    slicer: list[slice | int] = []
    for axis_index, axis in enumerate(order):
        if axis in ("Y", "X"):
            slicer.append(slice(None))
        else:
            fixed = indices[axis_index]
            slicer.append(int(fixed if fixed is not None else 0))

    frame = stack.data[tuple(slicer)]
    return np.asarray(frame, dtype=np.float64)
