from __future__ import annotations

from pathlib import Path

import numpy as np
import tifffile
import torch
from PIL import Image
from torch import nn
from torch.nn import functional as F
from torch.utils.data import Dataset
from torchvision.models import ResNet34_Weights, resnet34

from lisca.data.tiff import extract_timelapse_frames, load_roi_shape_from_index, select_frames_from_interleaved_pages

from .config import NUM_CLASSES
from .manifest import ExampleRecord


class SegmentationDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    def __init__(self, records: list[ExampleRecord], image_size: int, *, augment: bool = False) -> None:
        if not records:
            raise ValueError("Dataset split is empty")
        self.records = records
        self.image_size = image_size
        self.augment = augment

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        record = self.records[index]
        image = preprocess_tiff_image(record.image_path, image_size=self.image_size)
        mask = preprocess_mask_image(record.mask_path, image_size=self.image_size)
        if self.augment:
            image, mask = augment_example(image, mask)
        return image, mask


class DecoderBlock(nn.Module):
    def __init__(self, in_channels: int, skip_channels: int, out_channels: int) -> None:
        super().__init__()
        self.layers = nn.Sequential(
            nn.Conv2d(in_channels + skip_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = F.interpolate(x, size=skip.shape[-2:], mode="bilinear", align_corners=False)
        return self.layers(torch.cat([x, skip], dim=1))


class ResNetUNet(nn.Module):
    def __init__(
        self,
        *,
        in_channels: int = 1,
        num_classes: int = NUM_CLASSES,
        pretrained_encoder: bool = False,
    ) -> None:
        super().__init__()
        weights = ResNet34_Weights.IMAGENET1K_V1 if pretrained_encoder else None
        encoder = resnet34(weights=weights)
        if in_channels != 3:
            encoder.conv1 = self._adapt_input_conv(encoder.conv1, in_channels)

        self.stem = nn.Sequential(encoder.conv1, encoder.bn1, encoder.relu)
        self.maxpool = encoder.maxpool
        self.layer1 = encoder.layer1
        self.layer2 = encoder.layer2
        self.layer3 = encoder.layer3
        self.layer4 = encoder.layer4

        self.dec4 = DecoderBlock(512, 256, 256)
        self.dec3 = DecoderBlock(256, 128, 128)
        self.dec2 = DecoderBlock(128, 64, 64)
        self.dec1 = DecoderBlock(64, 64, 64)
        self.head = nn.Sequential(
            nn.Conv2d(64, 32, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, num_classes, kernel_size=1),
        )

    @staticmethod
    def _adapt_input_conv(conv: nn.Conv2d, in_channels: int) -> nn.Conv2d:
        adapted = nn.Conv2d(
            in_channels,
            conv.out_channels,
            kernel_size=conv.kernel_size,
            stride=conv.stride,
            padding=conv.padding,
            bias=conv.bias is not None,
        )
        with torch.no_grad():
            if in_channels == 1:
                adapted.weight.copy_(conv.weight.mean(dim=1, keepdim=True))
            else:
                repeated = conv.weight.mean(dim=1, keepdim=True).repeat(1, in_channels, 1, 1)
                adapted.weight.copy_(repeated / in_channels)
            if conv.bias is not None and adapted.bias is not None:
                adapted.bias.copy_(conv.bias)
        return adapted

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        input_size = x.shape[-2:]
        skip0 = self.stem(x)
        pooled = self.maxpool(skip0)
        skip1 = self.layer1(pooled)
        skip2 = self.layer2(skip1)
        skip3 = self.layer3(skip2)
        bottleneck = self.layer4(skip3)
        x = self.dec4(bottleneck, skip3)
        x = self.dec3(x, skip2)
        x = self.dec2(x, skip1)
        x = self.dec1(x, skip0)
        logits = self.head(x)
        return F.interpolate(logits, size=input_size, mode="bilinear", align_corners=False)


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


def default_readout_csv_path(image_path: Path) -> Path:
    return image_path.with_name(f"{image_path.stem}_seg_readout.csv")


def default_plot_path(readout_csv_path: Path) -> Path:
    return readout_csv_path.with_suffix(".png")


def build_model(*, pretrained_encoder: bool = False) -> nn.Module:
    return ResNetUNet(pretrained_encoder=pretrained_encoder)


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
    return image_tensor.squeeze(0).to(dtype=torch.float32)


def preprocess_tiff_image(image_path: Path, image_size: int) -> torch.Tensor:
    return preprocess_image_array(np.asarray(tifffile.imread(image_path)), image_size=image_size)


def load_mask_array(mask_path: Path) -> np.ndarray:
    if mask_path.suffix.lower() in {".tif", ".tiff"}:
        mask = np.asarray(tifffile.imread(mask_path))
    else:
        with Image.open(mask_path) as image:
            mask = np.asarray(image)
    if mask.ndim == 3:
        mask = mask[:, :, 0]
    mask = np.asarray(mask, dtype=np.int64)
    if mask.ndim != 2:
        raise ValueError(f"Expected a 2D mask, got shape {mask.shape}")
    return mask


def preprocess_mask_array(mask_array: np.ndarray, image_size: int) -> torch.Tensor:
    mask_tensor = torch.from_numpy(np.asarray(mask_array, dtype=np.float32)).unsqueeze(0).unsqueeze(0)
    resized = F.interpolate(mask_tensor, size=(image_size, image_size), mode="nearest")
    return resized.squeeze(0).squeeze(0).to(dtype=torch.long)


def preprocess_mask_image(mask_path: Path, image_size: int) -> torch.Tensor:
    return preprocess_mask_array(load_mask_array(mask_path), image_size=image_size)


def augment_example(image: torch.Tensor, mask: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    if torch.rand(()) < 0.5:
        image = torch.flip(image, dims=(2,))
        mask = torch.flip(mask, dims=(1,))
    if torch.rand(()) < 0.5:
        image = torch.flip(image, dims=(1,))
        mask = torch.flip(mask, dims=(0,))

    rotations = int(torch.randint(0, 4, ()).item())
    if rotations:
        image = torch.rot90(image, rotations, dims=(1, 2))
        mask = torch.rot90(mask, rotations, dims=(0, 1))

    contrast = float(torch.empty((), dtype=image.dtype).uniform_(0.9, 1.1).item())
    brightness = float(torch.empty((), dtype=image.dtype).uniform_(-0.08, 0.08).item())
    noise = torch.randn_like(image) * 0.03
    image = torch.clamp(image * contrast + brightness + noise, 0.0, 1.0)
    return image, mask
