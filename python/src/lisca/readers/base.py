"""Shared input format abstractions."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class ImageInfo:
    n_pos: int
    n_time: int
    n_chan: int
    n_z: int


@dataclass(frozen=True)
class ReaderSession:
    info: ImageInfo
    read_frame: Callable[[int, int, int, int], np.ndarray]
    close: Callable[[], None]


def ensure_2d(frame: np.ndarray) -> np.ndarray:
    """Normalize frame-like arrays to 2D by dropping singleton in-pixel channels."""
    frame = np.asarray(frame)
    if frame.ndim == 3 and frame.shape[0] == 1:
        return frame[0]
    if frame.ndim == 3 and frame.shape[-1] == 1:
        return frame[..., 0]
    return frame
