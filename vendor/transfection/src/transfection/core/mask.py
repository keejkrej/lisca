from __future__ import annotations

from pathlib import Path

import numpy as np
import tifffile

def workspace_mask_dir(workspace: Path) -> Path:
    return workspace.resolve() / "mask"


def position_mask_dir(workspace: Path, pos: int) -> Path:
    return workspace_mask_dir(workspace) / f"Pos{pos}"


def default_mask_path(
    workspace: Path,
    *,
    position: int,
    slide_channel: int,
    mask_channel: int,
    roi_file_name: str,
) -> Path:
    return (position_mask_dir(workspace, position) / Path(roi_file_name).name).resolve()


def read_mask_stack(mask_path: Path, *, time_count: int, frame_shape: tuple[int, int]) -> np.ndarray:
    if not mask_path.is_file():
        raise ValueError(f"Missing mask TIFF: {mask_path}. Run transfection segment first.")

    expected = (time_count, *frame_shape)
    # key=slice(None) forces multipage stacking. Without it, singleton-width
    # pages (H, 1) can return only the first page as shape (H, 1).
    raw_mask = np.asarray(tifffile.imread(mask_path, key=slice(None)))
    raw_mask = _normalize_mask_array(raw_mask, time_count=time_count, frame_shape=frame_shape)
    if raw_mask.shape != expected:
        raise ValueError(
            f"{mask_path} shape mismatch: expected {expected}, got {raw_mask.shape}"
        )
    return raw_mask > 0


def _normalize_mask_array(
    raw_mask: np.ndarray, *, time_count: int, frame_shape: tuple[int, int]
) -> np.ndarray:
    """Coerce loaded TIFF data to (T, H, W), including legacy squeezed W=1/H=1 files."""
    height, width = frame_shape
    expected = (time_count, height, width)

    if raw_mask.ndim == 2:
        if time_count == 1 and raw_mask.shape == frame_shape:
            return raw_mask[np.newaxis, :, :]
        # Legacy write path: tifffile squeezed W=1 → single plane (T, H)
        if width == 1 and raw_mask.shape == (time_count, height):
            return raw_mask[:, :, np.newaxis]
        # Legacy write path: squeezed H=1 → single plane (T, W)
        if height == 1 and raw_mask.shape == (time_count, width):
            return raw_mask[:, np.newaxis, :]
        return raw_mask

    if raw_mask.shape == expected:
        return raw_mask

    if raw_mask.size == int(np.prod(expected, dtype=np.int64)):
        return raw_mask.reshape(expected)

    return raw_mask

