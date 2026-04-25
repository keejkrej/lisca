from __future__ import annotations

from pathlib import Path

import numpy as np
import tifffile
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import Dataset
from torchvision.models import ResNet18_Weights, resnet18

from lisca.data.tiff import extract_timelapse_frames, load_roi_shape_from_index, select_frames_from_interleaved_pages

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
