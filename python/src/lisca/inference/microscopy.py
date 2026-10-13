"""CPU microscopy embedding shared with the Rust embedded server.

This is not EmbeddingGemma. The same plane formula lives in
``crates/lisca/src/inference/embed.rs``.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Any

import numpy as np
from PIL import Image

MODEL_ID = "cpu-microscopy"
REVISION = "v1"
ENCODER_ID = "cpu-microscopy-v1"
DIMENSIONS = 43
GRID = 4
BINS = 8
INTENSITY_SCALE = 65535.0


def embed_plane(width: int, height: int, pixels: Sequence[float]) -> np.ndarray:
    expected = width * height
    if width <= 0 or height <= 0 or len(pixels) != expected:
        raise ValueError(f"ROI frame is {width}x{height} but has {len(pixels)} pixels")
    samples = [float(pixel) for pixel in pixels]
    ordered = sorted(samples)
    low = _percentile_linear(ordered, 1.0)
    high = _percentile_linear(ordered, 99.0)
    span = high - low
    if abs(span) < 1e-9:
        normalized = [0.5] * len(samples)
    else:
        normalized = [min(1.0, max(0.0, (value - low) / span)) for value in samples]

    features: list[float] = []
    for gy in range(GRID):
        for gx in range(GRID):
            mean, std = _block_stats(width, height, normalized, gx, gy)
            features.append(mean)
            features.append(std)
    histogram = [0.0] * BINS
    for value in normalized:
        histogram[min(BINS - 1, math.floor(value * BINS))] += 1.0
    count = float(len(samples))
    features.extend(bin_count / count for bin_count in histogram)
    mean = sum(samples) / count
    variance = sum((value - mean) ** 2 for value in samples) / count
    features.append(mean / INTENSITY_SCALE)
    features.append(math.sqrt(variance) / INTENSITY_SCALE)
    features.append(1.0)
    vector = np.asarray(features, dtype=np.float32)
    norm = float(np.linalg.norm(vector))
    if not math.isfinite(norm) or norm == 0.0 or vector.shape != (DIMENSIONS,):
        raise ValueError("microscopy embedding is invalid")
    return vector / norm


class CpuMicroscopyEncoder:
    identity = ENCODER_ID
    model_id = MODEL_ID
    revision = REVISION
    dimensions = DIMENSIONS
    device = "cpu"

    def __init__(self, _device: str) -> None:
        self.device = "cpu"

    def encode(self, images: list[Image.Image]) -> np.ndarray:
        vectors = []
        for image in images:
            gray = image.convert("L")
            # Expand 8-bit PNG/JPEG to the 16-bit domain the ROI TIFF path uses.
            pixels = [value * 257 for value in gray.tobytes()]
            vectors.append(embed_plane(gray.width, gray.height, pixels))
        return np.stack(vectors)


def register_cpu_microscopy(register_model: Any) -> None:
    register_model(MODEL_ID, CpuMicroscopyEncoder)


def _percentile_linear(sorted_values: list[float], percentile: float) -> float:
    if len(sorted_values) <= 1:
        return sorted_values[0] if sorted_values else 0.0
    index = (percentile / 100.0) * (len(sorted_values) - 1)
    low = math.floor(index)
    high = math.ceil(index)
    fraction = index - low
    return sorted_values[low] * (1.0 - fraction) + sorted_values[high] * fraction


def _block_bounds(index: int, size: int) -> tuple[int, int] | None:
    start = index * size // GRID
    end = (index + 1) * size // GRID
    if end <= start:
        if start >= size:
            return None
        end = start + 1
    end = min(end, size)
    if start >= end:
        return None
    return start, end


def _block_stats(
    width: int, height: int, pixels: list[float], gx: int, gy: int
) -> tuple[float, float]:
    y_bounds = _block_bounds(gy, height)
    x_bounds = _block_bounds(gx, width)
    if y_bounds is None or x_bounds is None:
        return 0.0, 0.0
    y0, y1 = y_bounds
    x0, x1 = x_bounds
    values = [
        pixels[y * width + x] for y in range(y0, y1) for x in range(x0, x1)
    ]
    if not values:
        return 0.0, 0.0
    mean = sum(values) / len(values)
    variance = sum((value - mean) ** 2 for value in values) / len(values)
    return mean, math.sqrt(variance)
