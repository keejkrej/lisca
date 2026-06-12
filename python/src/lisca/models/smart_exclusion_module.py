from __future__ import annotations

from collections import Counter
from pathlib import Path

import lightning as L
import torch
import torch.nn.functional as F
from torch import nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchmetrics.classification import (
    MulticlassAccuracy,
    MulticlassAUROC,
    MulticlassF1Score,
)
from torchvision.models import ResNet18_Weights, resnet18

from lisca.core.image_preprocess import SmartExclusionPreprocess, load_png_image
from lisca.core.smart_exclusion_dataset_reader import (
    SmartExclusionSample,
    load_smart_exclusion_samples,
)

EXCLUDE_LABEL = 0
INCLUDE_LABEL = 1


class SmartExclusionDataset(Dataset[tuple[torch.Tensor, int]]):
    def __init__(
        self,
        samples: list[SmartExclusionSample],
        *,
        image_size: int = 224,
    ) -> None:
        self.samples = samples
        self.preprocess = SmartExclusionPreprocess(image_size=image_size)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        sample = self.samples[index]
        image = load_png_image(str(sample.path))
        tensor = self.preprocess(image)
        return tensor, sample.label


class SmartExclusionDataModule(L.LightningDataModule):
    def __init__(
        self,
        dataset_root: Path,
        *,
        batch_size: int = 32,
        image_size: int = 224,
        num_workers: int = 0,
    ) -> None:
        super().__init__()
        self.dataset_root = dataset_root
        self.batch_size = batch_size
        self.image_size = image_size
        self.num_workers = num_workers
        self.train_samples: list[SmartExclusionSample] = []
        self.val_samples: list[SmartExclusionSample] = []

    def setup(self, stage: str | None = None) -> None:
        del stage
        self.train_samples = load_smart_exclusion_samples(self.dataset_root, split="train")
        self.val_samples = load_smart_exclusion_samples(self.dataset_root, split="val")

    def _train_sampler(self) -> WeightedRandomSampler:
        label_counts = Counter(sample.label for sample in self.train_samples)
        total = len(self.train_samples)
        weights = [
            total / (len(label_counts) * label_counts[sample.label])
            for sample in self.train_samples
        ]
        return WeightedRandomSampler(
            weights=weights,
            num_samples=len(self.train_samples),
            replacement=True,
        )

    def train_dataloader(self) -> DataLoader:
        dataset = SmartExclusionDataset(
            self.train_samples,
            image_size=self.image_size,
        )
        return DataLoader(
            dataset,
            batch_size=self.batch_size,
            sampler=self._train_sampler(),
            num_workers=self.num_workers,
        )

    def val_dataloader(self) -> DataLoader:
        dataset = SmartExclusionDataset(
            self.val_samples,
            image_size=self.image_size,
        )
        return DataLoader(
            dataset,
            batch_size=self.batch_size,
            shuffle=False,
            num_workers=self.num_workers,
        )


class SmartExclusionModule(L.LightningModule):
    def __init__(self, *, learning_rate: float = 1e-4) -> None:
        super().__init__()
        self.save_hyperparameters()
        self.learning_rate = learning_rate

        backbone = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
        backbone.fc = nn.Linear(backbone.fc.in_features, 2)
        self.model = backbone
        self.loss_fn = nn.CrossEntropyLoss()

        num_classes = 2
        self.train_accuracy = MulticlassAccuracy(num_classes=num_classes)
        self.val_accuracy = MulticlassAccuracy(num_classes=num_classes)
        self.train_f1_macro = MulticlassF1Score(num_classes=num_classes, average="macro")
        self.val_f1_macro = MulticlassF1Score(num_classes=num_classes, average="macro")
        self.val_f1_exclude = MulticlassF1Score(
            num_classes=num_classes,
            average="none",
        )
        self.val_auroc = MulticlassAUROC(num_classes=num_classes, average="macro")

    def forward(self, images: torch.Tensor) -> torch.Tensor:
        return self.model(images)

    def _shared_step(self, batch: tuple[torch.Tensor, torch.Tensor], stage: str) -> torch.Tensor:
        images, labels = batch
        logits = self(images)
        loss = self.loss_fn(logits, labels)

        preds = torch.argmax(logits, dim=1)
        probs = F.softmax(logits, dim=1)

        if stage == "train":
            self.train_accuracy(preds, labels)
            self.train_f1_macro(preds, labels)
            self.log("train/loss", loss, prog_bar=True, on_step=False, on_epoch=True)
            self.log("train/accuracy", self.train_accuracy, prog_bar=True, on_epoch=True)
            self.log("train/f1_macro", self.train_f1_macro, on_epoch=True)
        else:
            self.val_accuracy(preds, labels)
            self.val_f1_macro(preds, labels)
            f1_per_class = self.val_f1_exclude(preds, labels)
            self.val_auroc(probs, labels)
            self.log("val/loss", loss, prog_bar=True, on_step=False, on_epoch=True)
            self.log("val/accuracy", self.val_accuracy, prog_bar=True, on_epoch=True)
            self.log("val/f1_macro", self.val_f1_macro, on_epoch=True)
            self.log("val/f1_exclude", f1_per_class[EXCLUDE_LABEL], prog_bar=True, on_epoch=True)
            self.log("val/f1_include", f1_per_class[INCLUDE_LABEL], on_epoch=True)
            self.log("val/auroc", self.val_auroc, on_epoch=True)

        return loss

    def training_step(self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int) -> torch.Tensor:
        del batch_idx
        return self._shared_step(batch, "train")

    def validation_step(self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int) -> torch.Tensor:
        del batch_idx
        return self._shared_step(batch, "val")

    def configure_optimizers(self) -> torch.optim.AdamW:
        return torch.optim.AdamW(self.parameters(), lr=self.learning_rate)
