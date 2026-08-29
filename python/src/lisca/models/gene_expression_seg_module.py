"""Small U-Net for gene-expression BF foreground/background segmentation."""

from __future__ import annotations

from pathlib import Path

import lightning as L
import torch
import torch.nn.functional as F
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import functional as tf

from lisca.core.image_preprocess import IMAGENET_MEAN, IMAGENET_STD
from lisca.services.gene_expression_seg_dataset import load_image_mask_pair, load_seg_samples


class DoubleConv(nn.Module):
    def __init__(self, in_ch: int, out_ch: int) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class SmallUNet(nn.Module):
    """Compact 4-level U-Net (~1–2M params) for ~128² BF crops."""

    def __init__(self, in_channels: int = 3, base_channels: int = 32) -> None:
        super().__init__()
        c1, c2, c3, c4 = (
            base_channels,
            base_channels * 2,
            base_channels * 4,
            base_channels * 8,
        )
        self.enc1 = DoubleConv(in_channels, c1)
        self.enc2 = DoubleConv(c1, c2)
        self.enc3 = DoubleConv(c2, c3)
        self.bottleneck = DoubleConv(c3, c4)
        self.pool = nn.MaxPool2d(2)
        self.up3 = nn.ConvTranspose2d(c4, c3, kernel_size=2, stride=2)
        self.dec3 = DoubleConv(c4, c3)
        self.up2 = nn.ConvTranspose2d(c3, c2, kernel_size=2, stride=2)
        self.dec2 = DoubleConv(c3, c2)
        self.up1 = nn.ConvTranspose2d(c2, c1, kernel_size=2, stride=2)
        self.dec1 = DoubleConv(c2, c1)
        self.head = nn.Conv2d(c1, 1, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        b = self.bottleneck(self.pool(e3))
        d3 = self.up3(b)
        d3 = self._match(d3, e3)
        d3 = self.dec3(torch.cat([d3, e3], dim=1))
        d2 = self.up2(d3)
        d2 = self._match(d2, e2)
        d2 = self.dec2(torch.cat([d2, e2], dim=1))
        d1 = self.up1(d2)
        d1 = self._match(d1, e1)
        d1 = self.dec1(torch.cat([d1, e1], dim=1))
        return self.head(d1)

    @staticmethod
    def _match(upsampled: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        if upsampled.shape[-2:] == skip.shape[-2:]:
            return upsampled
        return F.interpolate(
            upsampled, size=skip.shape[-2:], mode="bilinear", align_corners=False
        )


def dice_loss_with_logits(logits: torch.Tensor, targets: torch.Tensor, eps: float = 1e-6) -> torch.Tensor:
    probs = torch.sigmoid(logits)
    targets = targets.float()
    dims = (1, 2, 3)
    intersection = (probs * targets).sum(dim=dims)
    denom = probs.sum(dim=dims) + targets.sum(dim=dims)
    dice = (2.0 * intersection + eps) / (denom + eps)
    return 1.0 - dice.mean()


def soft_dice(logits: torch.Tensor, targets: torch.Tensor, eps: float = 1e-6) -> torch.Tensor:
    probs = (torch.sigmoid(logits) > 0.5).float()
    targets = targets.float()
    dims = (1, 2, 3)
    intersection = (probs * targets).sum(dim=dims)
    denom = probs.sum(dim=dims) + targets.sum(dim=dims)
    return ((2.0 * intersection + eps) / (denom + eps)).mean()


class GeneExpressionSegDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    def __init__(
        self,
        dataset_root: Path,
        samples: list[dict],
        *,
        image_size: int = 128,
    ) -> None:
        self.dataset_root = dataset_root
        self.samples = samples
        self.image_size = image_size

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        sample = self.samples[index]
        image, mask = load_image_mask_pair(self.dataset_root, sample)
        image = tf.resize(
            image,
            [self.image_size, self.image_size],
            interpolation=tf.InterpolationMode.BILINEAR,
        )
        mask = tf.resize(
            mask,
            [self.image_size, self.image_size],
            interpolation=tf.InterpolationMode.NEAREST,
        )
        rgb = image.convert("RGB")
        image_t = tf.normalize(tf.to_tensor(rgb), IMAGENET_MEAN, IMAGENET_STD)
        mask_t = (tf.to_tensor(mask) > 0.5).float()
        return image_t, mask_t


class GeneExpressionSegDataModule(L.LightningDataModule):
    def __init__(
        self,
        dataset_root: Path,
        *,
        batch_size: int = 16,
        image_size: int = 128,
        num_workers: int = 0,
    ) -> None:
        super().__init__()
        self.dataset_root = dataset_root
        self.batch_size = batch_size
        self.image_size = image_size
        self.num_workers = num_workers
        self.train_samples: list[dict] = []
        self.val_samples: list[dict] = []

    def setup(self, stage: str | None = None) -> None:
        del stage
        self.train_samples = load_seg_samples(self.dataset_root, split="train")
        self.val_samples = load_seg_samples(self.dataset_root, split="val")
        if not self.train_samples:
            raise ValueError("no train samples in dataset")
        if not self.val_samples:
            raise ValueError("no val samples in dataset")

    def train_dataloader(self) -> DataLoader:
        return DataLoader(
            GeneExpressionSegDataset(
                self.dataset_root, self.train_samples, image_size=self.image_size
            ),
            batch_size=self.batch_size,
            shuffle=True,
            num_workers=self.num_workers,
        )

    def val_dataloader(self) -> DataLoader:
        return DataLoader(
            GeneExpressionSegDataset(
                self.dataset_root, self.val_samples, image_size=self.image_size
            ),
            batch_size=self.batch_size,
            shuffle=False,
            num_workers=self.num_workers,
        )


class GeneExpressionSegModule(L.LightningModule):
    def __init__(
        self,
        *,
        learning_rate: float = 1e-3,
        base_channels: int = 32,
        bce_weight: float = 0.5,
    ) -> None:
        super().__init__()
        self.save_hyperparameters()
        self.learning_rate = learning_rate
        self.bce_weight = bce_weight
        self.model = SmallUNet(in_channels=3, base_channels=base_channels)
        self.bce = nn.BCEWithLogitsLoss()

    def forward(self, images: torch.Tensor) -> torch.Tensor:
        return self.model(images)

    def _shared_step(self, batch: tuple[torch.Tensor, torch.Tensor], stage: str) -> torch.Tensor:
        images, masks = batch
        logits = self(images)
        loss_bce = self.bce(logits, masks)
        loss_dice = dice_loss_with_logits(logits, masks)
        loss = self.bce_weight * loss_bce + (1.0 - self.bce_weight) * loss_dice
        dice = soft_dice(logits, masks)
        self.log(f"{stage}/loss", loss, prog_bar=True, on_step=False, on_epoch=True)
        self.log(f"{stage}/dice", dice, prog_bar=True, on_step=False, on_epoch=True)
        self.log(f"{stage}/bce", loss_bce, on_epoch=True)
        self.log(f"{stage}/dice_loss", loss_dice, on_epoch=True)
        return loss

    def training_step(
        self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int
    ) -> torch.Tensor:
        del batch_idx
        return self._shared_step(batch, "train")

    def validation_step(
        self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int
    ) -> torch.Tensor:
        del batch_idx
        return self._shared_step(batch, "val")

    def configure_optimizers(self) -> dict:
        optimizer = torch.optim.AdamW(self.parameters(), lr=self.learning_rate)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer, T_max=max(1, int(self.trainer.max_epochs or 1))
        )
        return {
            "optimizer": optimizer,
            "lr_scheduler": {"scheduler": scheduler, "interval": "epoch"},
        }
