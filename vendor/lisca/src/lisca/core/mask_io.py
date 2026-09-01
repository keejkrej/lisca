"""Multipage Gray8 mask TIFF I/O matching transfection / lisca-analyze."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import tifffile


def write_mask_tif(mask_stack: np.ndarray, output_path: Path) -> None:
    """Write a (T, H, W) mask stack as one Gray8 TIFF page per timepoint.

    Do not pass the full array to ``tifffile.imwrite``: when W==1 or H==1 it
    squeezes the singleton spatial axis and stores a single 2D plane.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    arr = np.asarray(mask_stack, dtype=np.uint8)
    if arr.ndim != 3:
        msg = f"mask_stack must have shape (T, H, W), got {arr.shape}"
        raise ValueError(msg)
    if arr.shape[0] == 0:
        raise ValueError("mask_stack has no timepoints")

    with tifffile.TiffWriter(output_path) as writer:
        for frame in arr:
            writer.write(
                np.ascontiguousarray(frame),
                photometric="minisblack",
                contiguous=False,
            )


def write_mask_png(mask: np.ndarray, output_path: Path) -> None:
    """Write a 2D binary mask as a Gray8 PNG (0/255)."""
    from PIL import Image

    output_path.parent.mkdir(parents=True, exist_ok=True)
    arr = np.asarray(mask)
    if arr.ndim != 2:
        msg = f"mask must be 2D, got shape={arr.shape}"
        raise ValueError(msg)
    binary = (arr > 0).astype(np.uint8) * 255
    Image.fromarray(binary, mode="L").save(output_path)


def read_mask_png(path: Path) -> np.ndarray:
    from PIL import Image

    image = Image.open(path).convert("L")
    return (np.asarray(image) > 0).astype(np.uint8)
