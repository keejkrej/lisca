from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import tifffile
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import Dataset
from torchvision.models import ResNet18_Weights, resnet18

from .manifest import ExampleRecord


IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406], dtype=torch.float32).view(3, 1, 1)
IMAGENET_STD = torch.tensor([0.229, 0.224, 0.225], dtype=torch.float32).view(3, 1, 1)


class ApoptosisFrameDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    def __init__(self, records: list[ExampleRecord], image_size: int) -> None:
        if not records:
            raise ValueError("Dataset split is empty")
        self.records = records
        self.image_size = image_size

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        record = self.records[index]
        image = preprocess_tiff_image(record.image_path, image_size=self.image_size)
        target = torch.tensor(record.dead_probability, dtype=torch.float32)
        return image, target


def choose_device(requested_device: str) -> torch.device:
    lowered = requested_device.lower()
    if lowered == "auto":
        if torch.cuda.is_available():
            return torch.device("cuda")
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")
    return torch.device(lowered)


def set_seed(seed: int) -> None:
    import random

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def default_scores_csv_path(image_path: Path, channel: int) -> Path:
    return image_path.with_name(f"{image_path.stem}_ch{channel}_scores.csv")


def default_scores_plot_path(scores_csv_path: Path) -> Path:
    return scores_csv_path.with_suffix(".png")


def preprocess_image_array(image_array: np.ndarray, image_size: int) -> torch.Tensor:
    image_array = np.asarray(image_array)
    image_array = np.squeeze(image_array)
    if image_array.ndim != 2:
        raise ValueError(f"Expected a 2D image, got shape {image_array.shape}")

    image_tensor = torch.from_numpy(image_array.astype(np.float32, copy=False))
    min_value = float(image_tensor.min())
    max_value = float(image_tensor.max())
    if max_value > min_value:
        image_tensor = (image_tensor - min_value) / (max_value - min_value)
    else:
        image_tensor = torch.zeros_like(image_tensor)

    image_tensor = image_tensor.unsqueeze(0).unsqueeze(0)
    image_tensor = F.interpolate(
        image_tensor,
        size=(image_size, image_size),
        mode="bilinear",
        align_corners=False,
    )
    image_tensor = image_tensor.squeeze(0).repeat(3, 1, 1)
    image_tensor = (image_tensor - IMAGENET_MEAN) / IMAGENET_STD
    return image_tensor.to(dtype=torch.float32)


def preprocess_tiff_image(image_path: Path, image_size: int) -> torch.Tensor:
    return preprocess_image_array(np.asarray(tifffile.imread(image_path)), image_size=image_size)


def build_model(pretrained: bool) -> nn.Module:
    weights = ResNet18_Weights.IMAGENET1K_V1 if pretrained else None
    model = resnet18(weights=weights)
    model.fc = nn.Linear(model.fc.in_features, 1)
    return model


def load_roi_shape_from_index(tif_path: Path) -> tuple[int, int, int, int, int] | None:
    index_path = tif_path.parent / "index.json"
    if not index_path.exists():
        return None

    payload = json.loads(index_path.read_text(encoding="utf-8"))
    for roi_entry in payload.get("rois", []):
        if str(roi_entry.get("fileName")) == tif_path.name:
            shape = tuple(int(size) for size in roi_entry["shape"])
            if len(shape) != 5:
                raise ValueError(f"ROI shape from {index_path} must have 5 dimensions, got {shape}")
            return shape
    return None


def select_frames_from_interleaved_pages(
    raw_stack: np.ndarray,
    *,
    channel: int,
    channel_count: int,
) -> np.ndarray:
    if raw_stack.ndim != 3:
        raise ValueError(f"Expected flattened pages with shape (N, Y, X), got {raw_stack.shape}")
    if channel_count <= 0:
        raise ValueError(f"channel_count must be positive, got {channel_count}")
    if not 0 <= channel < channel_count:
        raise ValueError(f"channel must be between 0 and {channel_count - 1}, got {channel}")
    if raw_stack.shape[0] % channel_count != 0:
        raise ValueError(
            f"Page count {raw_stack.shape[0]} is not divisible by channel_count={channel_count}"
        )
    time_count = raw_stack.shape[0] // channel_count
    reshaped = raw_stack.reshape(time_count, channel_count, raw_stack.shape[1], raw_stack.shape[2])
    return np.asarray(reshaped[:, channel, :, :])


def extract_timelapse_frames(
    tif_path: Path,
    *,
    channel: int,
    channel_count: int | None = None,
) -> np.ndarray:
    resolved_path = tif_path.resolve()
    with tifffile.TiffFile(resolved_path) as tif:
        series = tif.series[0]
        axes = series.axes
        raw_stack = np.asarray(series.asarray())

    roi_shape = load_roi_shape_from_index(resolved_path)
    if roi_shape is not None:
        time_count, indexed_channel_count, z_count, height, width = roi_shape
        if not 0 <= channel < indexed_channel_count:
            raise ValueError(
                f"channel must be between 0 and {indexed_channel_count - 1}, got {channel}"
            )
        flattened_pages = time_count * indexed_channel_count * z_count
        if raw_stack.shape == roi_shape:
            reshaped = raw_stack
        elif raw_stack.ndim == 3 and raw_stack.shape == (flattened_pages, height, width):
            reshaped = raw_stack.reshape(roi_shape)
        elif raw_stack.ndim == 4 and raw_stack.shape == (time_count, indexed_channel_count, height, width):
            reshaped = raw_stack.reshape(time_count, indexed_channel_count, z_count, height, width)
        else:
            raise ValueError(
                f"{resolved_path} must reshape to {roi_shape}, got raw TIFF shape {raw_stack.shape}"
            )
        return np.asarray(reshaped[:, channel, 0, :, :])

    if raw_stack.ndim == 2:
        if channel != 0:
            raise ValueError(f"{resolved_path} is a single-channel frame; channel must be 0")
        return raw_stack[np.newaxis, :, :]

    if axes == "TYX":
        if channel != 0:
            raise ValueError(f"{resolved_path} has no explicit channel axis; channel must be 0")
        return np.asarray(raw_stack)

    if axes == "CYX":
        if not 0 <= channel < raw_stack.shape[0]:
            raise ValueError(f"channel must be between 0 and {raw_stack.shape[0] - 1}, got {channel}")
        return np.asarray(raw_stack[channel : channel + 1, :, :])

    if axes == "TCYX":
        if not 0 <= channel < raw_stack.shape[1]:
            raise ValueError(f"channel must be between 0 and {raw_stack.shape[1] - 1}, got {channel}")
        return np.asarray(raw_stack[:, channel, :, :])

    if axes == "TCZYX":
        if not 0 <= channel < raw_stack.shape[1]:
            raise ValueError(f"channel must be between 0 and {raw_stack.shape[1] - 1}, got {channel}")
        return np.asarray(raw_stack[:, channel, 0, :, :])

    if axes == "IYX":
        inferred_channel_count = channel_count if channel_count is not None else 1
        return select_frames_from_interleaved_pages(
            np.asarray(raw_stack),
            channel=channel,
            channel_count=inferred_channel_count,
        )

    raise ValueError(f"Unsupported TIFF axes {axes!r} for {resolved_path}")
