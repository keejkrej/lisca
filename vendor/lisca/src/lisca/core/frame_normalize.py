from __future__ import annotations

import numpy as np
from PIL import Image


def normalize_frame_to_uint8(values: np.ndarray) -> np.ndarray:
    if values.size == 0:
        return np.zeros((0,), dtype=np.uint8)
    minimum = float(values.min())
    maximum = float(values.max())
    value_range = maximum - minimum
    if value_range <= 0:
        return np.zeros(values.shape, dtype=np.uint8)
    scaled = ((values.astype(np.float64) - minimum) / value_range) * 255.0
    return np.clip(np.round(scaled), 0, 255).astype(np.uint8)


def crop_frame_uint8(frame: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    height, width = frame.shape[:2]
    right = min(x + w, width)
    bottom = min(y + h, height)
    left = max(x, 0)
    top = max(y, 0)
    if right <= left or bottom <= top:
        return np.zeros((0, 0), dtype=np.uint8)
    crop = frame[top:bottom, left:right]
    return normalize_frame_to_uint8(crop)


def resize_grayscale(image: np.ndarray, size: int) -> np.ndarray:
    if image.size == 0:
        return image
    pil_image = Image.fromarray(image)
    resized = pil_image.resize((size, size), Image.Resampling.BILINEAR)
    return np.asarray(resized, dtype=np.uint8)


def save_grayscale_png(path: str, image: np.ndarray) -> None:
    Image.fromarray(image).save(path)
