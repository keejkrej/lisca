from __future__ import annotations

import csv
import json
import math
from pathlib import Path
from typing import Any

import lightning as L
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader

from lisca.data.manifest import UNIFIED_LABEL_FIELDS

from .config import CLASS_NAMES, NUM_CLASSES, TrainingArtifacts, TrainingConfig, default_run_name
from .manifest import ExampleRecord, load_manifest, split_records_by_roi
from .model import SegmentationDataset, build_model, choose_device, load_mask_array, set_seed


def build_dataloader(
    records: list[ExampleRecord],
    *,
    image_size: int,
    batch_size: int,
    shuffle: bool,
    num_workers: int,
    augment: bool = False,
) -> DataLoader[tuple[torch.Tensor, torch.Tensor]]:
    dataset = SegmentationDataset(records=records, image_size=image_size, augment=augment)
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )


def compute_class_weights(records: list[ExampleRecord]) -> torch.Tensor:
    counts = np.zeros(NUM_CLASSES, dtype=np.float64)
    for record in records:
        mask = load_mask_array(record.mask_path)
        bincount = np.bincount(mask.reshape(-1), minlength=NUM_CLASSES)
        counts += bincount[:NUM_CLASSES]
    counts = np.maximum(counts, 1.0)
    weights = counts.sum() / (NUM_CLASSES * counts)
    weights = weights / weights.mean()
    return torch.tensor(weights, dtype=torch.float32)


def update_confusion_matrix(confusion: np.ndarray, predictions: torch.Tensor, targets: torch.Tensor) -> None:
    flattened_predictions = predictions.reshape(-1).cpu().numpy()
    flattened_targets = targets.reshape(-1).cpu().numpy()
    combined = flattened_targets * NUM_CLASSES + flattened_predictions
    bincount = np.bincount(combined, minlength=NUM_CLASSES * NUM_CLASSES)
    confusion += bincount.reshape(NUM_CLASSES, NUM_CLASSES)


def metrics_from_confusion(confusion: np.ndarray) -> dict[str, float]:
    metrics: dict[str, float] = {}
    ious: list[float] = []
    for class_index, class_name in enumerate(CLASS_NAMES):
        true_positive = float(confusion[class_index, class_index])
        false_positive = float(confusion[:, class_index].sum() - true_positive)
        false_negative = float(confusion[class_index, :].sum() - true_positive)
        denominator = true_positive + false_positive + false_negative
        iou = float("nan") if denominator == 0.0 else true_positive / denominator
        metrics[f"iou_{class_name}"] = iou
        if not math.isnan(iou):
            ious.append(iou)
    metrics["miou"] = float("nan") if not ious else sum(ious) / len(ious)
    return metrics


def run_epoch(
    model: nn.Module,
    dataloader: DataLoader[tuple[torch.Tensor, torch.Tensor]],
    *,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    class_weights: torch.Tensor,
    dice_weight: float,
) -> dict[str, float]:
    loss_fn = nn.CrossEntropyLoss(weight=class_weights.to(device))
    training = optimizer is not None
    model.train(training)

    total_examples = 0
    total_loss = 0.0
    confusion = np.zeros((NUM_CLASSES, NUM_CLASSES), dtype=np.int64)

    for images, batch_targets in dataloader:
        images = images.to(device)
        batch_targets = batch_targets.to(device)

        with torch.set_grad_enabled(training):
            logits = model(images)
            ce_loss = loss_fn(logits, batch_targets)
            dice_loss = multiclass_dice_loss(logits, batch_targets)
            loss = ce_loss + dice_weight * dice_loss
            if training:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

        batch_size = images.shape[0]
        total_examples += batch_size
        total_loss += float(loss.detach().cpu()) * batch_size
        predictions = logits.argmax(dim=1)
        update_confusion_matrix(confusion, predictions, batch_targets)

    if total_examples == 0:
        raise ValueError("Dataloader produced zero examples")

    metrics = metrics_from_confusion(confusion)
    metrics["loss"] = total_loss / total_examples
    return metrics


def multiclass_dice_loss(logits: torch.Tensor, targets: torch.Tensor, epsilon: float = 1e-6) -> torch.Tensor:
    probabilities = torch.softmax(logits, dim=1)
    target_one_hot = F.one_hot(targets, num_classes=NUM_CLASSES).permute(0, 3, 1, 2).to(probabilities.dtype)
    intersection = (probabilities * target_one_hot).sum(dim=(0, 2, 3))
    denominator = probabilities.sum(dim=(0, 2, 3)) + target_one_hot.sum(dim=(0, 2, 3))
    dice = (2.0 * intersection + epsilon) / (denominator + epsilon)
    return 1.0 - dice.mean()


def make_run_dir(artifact_root: Path, run_name: str | None) -> Path:
    resolved_root = artifact_root.resolve()
    resolved_root.mkdir(parents=True, exist_ok=True)
    run_dir = resolved_root / (run_name or default_run_name())
    run_dir.mkdir(parents=True, exist_ok=False)
    return run_dir


def write_split_manifest(path: Path, records: list[ExampleRecord]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=UNIFIED_LABEL_FIELDS)
        writer.writeheader()
        for record in records:
            writer.writerow(
                {
                    "image_relpath": record.image_relpath,
                    "mask_relpath": record.mask_relpath,
                    "target_type": "segmentation",
                    "split_folder": "",
                    "position": record.position,
                    "roi": record.roi,
                    "time_index": record.time_index,
                    "source_tif": record.source_tif,
                    "source_mask": record.source_mask,
                    "width": record.width,
                    "height": record.height,
                    "live_anchor_t": "",
                    "dead_anchor_t": "",
                    "dead_probability": "",
                    "annotation_mode": "mask",
                }
            )


def save_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def format_metric(value: float) -> str:
    if math.isnan(value):
        return "nan"
    return f"{value:.6f}"


def save_checkpoint(
    path: Path,
    *,
    model: nn.Module,
    config: TrainingConfig,
    epoch: int,
    metrics: dict[str, float],
    class_weights: torch.Tensor,
) -> None:
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "config": config.to_dict(),
            "epoch": epoch,
            "metrics": metrics,
            "class_weights": class_weights.cpu(),
        },
        path,
    )


def summarize_split(records: list[ExampleRecord]) -> dict[str, int]:
    return {
        "frames": len(records),
        "rois": len({record.roi_group for record in records}),
    }


def trainer_device_kwargs(requested_device: str) -> dict[str, Any]:
    lowered = requested_device.lower()
    if lowered == "auto":
        return {"accelerator": "auto", "devices": "auto"}
    if lowered == "cpu":
        return {"accelerator": "cpu", "devices": 1}
    if lowered == "mps":
        return {"accelerator": "mps", "devices": 1}
    if lowered == "cuda":
        return {"accelerator": "gpu", "devices": 1}
    if lowered.startswith("cuda:"):
        return {"accelerator": "gpu", "devices": [int(lowered.split(":", 1)[1])]}
    return {"accelerator": lowered, "devices": 1}


class SegmentationLightningModule(L.LightningModule):
    def __init__(
        self,
        *,
        config: TrainingConfig,
        class_weights: torch.Tensor,
        best_checkpoint_path: Path,
        last_checkpoint_path: Path,
    ) -> None:
        super().__init__()
        self.config = config
        self.best_checkpoint_path = best_checkpoint_path
        self.last_checkpoint_path = last_checkpoint_path
        self.model = build_model()
        self.register_buffer("class_weights", class_weights.detach().clone().to(dtype=torch.float32))
        self.best_val_loss = float("inf")
        self.history_rows: list[dict[str, str | int]] = []
        self.latest_test_metrics: dict[str, float] | None = None
        self._latest_train_metrics: dict[str, float] | None = None
        self._latest_val_metrics: dict[str, float] | None = None
        self._latest_train_epoch: int | None = None
        self._latest_val_epoch: int | None = None
        self._finalized_epochs: set[int] = set()
        self._reset_epoch_buffers("train")
        self._reset_epoch_buffers("val")
        self._reset_epoch_buffers("test")

    def forward(self, images: torch.Tensor) -> torch.Tensor:
        return self.model(images)

    def configure_optimizers(self) -> dict[str, Any]:
        optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=self.config.lr,
            weight_decay=self.config.weight_decay,
        )
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer,
            T_max=max(self.config.epochs, 1),
            eta_min=self.config.lr * self.config.lr_decay,
        )
        return {"optimizer": optimizer, "lr_scheduler": {"scheduler": scheduler, "interval": "epoch"}}

    def _reset_epoch_buffers(self, stage: str) -> None:
        setattr(self, f"_{stage}_total_examples", 0)
        setattr(self, f"_{stage}_total_loss", 0.0)
        setattr(self, f"_{stage}_confusion", np.zeros((NUM_CLASSES, NUM_CLASSES), dtype=np.int64))

    def _shared_step(self, batch: tuple[torch.Tensor, torch.Tensor], stage: str) -> torch.Tensor:
        images, batch_targets = batch
        logits = self(images)
        loss_fn = nn.CrossEntropyLoss(weight=self.class_weights)
        ce_loss = loss_fn(logits, batch_targets)
        dice_loss = multiclass_dice_loss(logits, batch_targets)
        loss = ce_loss + self.config.dice_weight * dice_loss
        batch_size = int(images.shape[0])
        setattr(self, f"_{stage}_total_examples", getattr(self, f"_{stage}_total_examples") + batch_size)
        setattr(
            self,
            f"_{stage}_total_loss",
            getattr(self, f"_{stage}_total_loss") + float(loss.detach().cpu()) * batch_size,
        )
        predictions = logits.argmax(dim=1)
        update_confusion_matrix(getattr(self, f"_{stage}_confusion"), predictions, batch_targets)
        self.log(f"{stage}_loss_step", loss, prog_bar=False, logger=False)
        return loss

    def training_step(self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int) -> torch.Tensor:
        return self._shared_step(batch, "train")

    def validation_step(self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int) -> torch.Tensor:
        return self._shared_step(batch, "val")

    def test_step(self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int) -> torch.Tensor:
        return self._shared_step(batch, "test")

    def _epoch_metrics(self, stage: str) -> dict[str, float]:
        total_examples = int(getattr(self, f"_{stage}_total_examples"))
        if total_examples == 0:
            raise ValueError(f"{stage} dataloader produced zero examples")
        metrics = metrics_from_confusion(getattr(self, f"_{stage}_confusion"))
        metrics["loss"] = float(getattr(self, f"_{stage}_total_loss")) / total_examples
        return metrics

    def on_train_epoch_start(self) -> None:
        self._reset_epoch_buffers("train")

    def on_validation_epoch_start(self) -> None:
        if not self.trainer.sanity_checking:
            self._reset_epoch_buffers("val")

    def on_test_epoch_start(self) -> None:
        self._reset_epoch_buffers("test")

    def on_validation_epoch_end(self) -> None:
        if not self.trainer.sanity_checking:
            self._latest_val_metrics = self._epoch_metrics("val")
            self._latest_val_epoch = int(self.current_epoch) + 1
            self._finalize_epoch_if_ready()

    def on_train_epoch_end(self) -> None:
        self._latest_train_metrics = self._epoch_metrics("train")
        self._latest_train_epoch = int(self.current_epoch) + 1
        self._finalize_epoch_if_ready()

    def on_test_epoch_end(self) -> None:
        self.latest_test_metrics = self._epoch_metrics("test")

    def _finalize_epoch_if_ready(self) -> None:
        epoch = int(self.current_epoch) + 1
        if (
            epoch in self._finalized_epochs
            or self._latest_train_metrics is None
            or self._latest_val_metrics is None
            or self._latest_train_epoch != epoch
            or self._latest_val_epoch != epoch
        ):
            return

        train_metrics = self._latest_train_metrics
        val_metrics = self._latest_val_metrics
        current_lr = float(self.trainer.optimizers[0].param_groups[0]["lr"])
        combined_metrics = {
            "train_loss": train_metrics["loss"],
            "train_miou": train_metrics["miou"],
            "train_iou_background": train_metrics["iou_background"],
            "train_iou_live": train_metrics["iou_live"],
            "train_iou_dead": train_metrics["iou_dead"],
            "val_loss": val_metrics["loss"],
            "val_miou": val_metrics["miou"],
            "val_iou_background": val_metrics["iou_background"],
            "val_iou_live": val_metrics["iou_live"],
            "val_iou_dead": val_metrics["iou_dead"],
            "lr": current_lr,
        }
        save_checkpoint(
            self.last_checkpoint_path,
            model=self.model,
            config=self.config,
            epoch=epoch,
            metrics=combined_metrics,
            class_weights=self.class_weights.detach().cpu(),
        )
        if val_metrics["loss"] < self.best_val_loss:
            self.best_val_loss = val_metrics["loss"]
            save_checkpoint(
                self.best_checkpoint_path,
                model=self.model,
                config=self.config,
                epoch=epoch,
                metrics=combined_metrics,
                class_weights=self.class_weights.detach().cpu(),
            )

        self.history_rows.append(
            {
                "epoch": epoch,
                "lr": format_metric(current_lr),
                "train_loss": format_metric(train_metrics["loss"]),
                "train_miou": format_metric(train_metrics["miou"]),
                "train_iou_background": format_metric(train_metrics["iou_background"]),
                "train_iou_live": format_metric(train_metrics["iou_live"]),
                "train_iou_dead": format_metric(train_metrics["iou_dead"]),
                "val_loss": format_metric(val_metrics["loss"]),
                "val_miou": format_metric(val_metrics["miou"]),
                "val_iou_background": format_metric(val_metrics["iou_background"]),
                "val_iou_live": format_metric(val_metrics["iou_live"]),
                "val_iou_dead": format_metric(val_metrics["iou_dead"]),
            }
        )
        self._finalized_epochs.add(epoch)


def train_model(config: TrainingConfig) -> TrainingArtifacts:
    set_seed(config.seed)
    L.seed_everything(config.seed, workers=True, verbose=False)
    dataset_root = config.dataset_root.resolve()
    artifact_root = config.artifact_root.resolve()
    device = choose_device(config.device)

    records = load_manifest(dataset_root)
    split_map = split_records_by_roi(records, seed=config.seed)
    run_dir = make_run_dir(artifact_root, config.run_name)

    train_split_path = run_dir / "train_split.csv"
    val_split_path = run_dir / "val_split.csv"
    test_split_path = run_dir / "test_split.csv"
    write_split_manifest(train_split_path, split_map["train"])
    write_split_manifest(val_split_path, split_map["val"])
    write_split_manifest(test_split_path, split_map["test"])

    config_path = run_dir / "config.json"
    metrics_csv_path = run_dir / "metrics.csv"
    best_checkpoint_path = run_dir / "best.pt"
    last_checkpoint_path = run_dir / "last.pt"
    test_metrics_path = run_dir / "test_metrics.json"

    class_weights = compute_class_weights(split_map["train"])
    save_json(
        config_path,
        {
            **config.to_dict(),
            "device_resolved": str(device),
            "split_summary": {
                split_name: summarize_split(split_records)
                for split_name, split_records in split_map.items()
            },
            "class_weights": [float(value) for value in class_weights.tolist()],
        },
    )

    train_loader = build_dataloader(
        split_map["train"],
        image_size=config.image_size,
        batch_size=config.batch_size,
        shuffle=True,
        num_workers=config.num_workers,
        augment=True,
    )
    val_loader = build_dataloader(
        split_map["val"],
        image_size=config.image_size,
        batch_size=config.batch_size,
        shuffle=False,
        num_workers=config.num_workers,
    )
    test_loader = build_dataloader(
        split_map["test"],
        image_size=config.image_size,
        batch_size=config.batch_size,
        shuffle=False,
        num_workers=config.num_workers,
    )

    lightning_module = SegmentationLightningModule(
        config=config,
        class_weights=class_weights,
        best_checkpoint_path=best_checkpoint_path,
        last_checkpoint_path=last_checkpoint_path,
    )
    trainer = L.Trainer(
        max_epochs=config.epochs,
        logger=False,
        enable_checkpointing=False,
        enable_progress_bar=False,
        num_sanity_val_steps=0,
        **trainer_device_kwargs(config.device),
    )
    trainer.fit(lightning_module, train_dataloaders=train_loader, val_dataloaders=val_loader)

    with metrics_csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "epoch",
                "lr",
                "train_loss",
                "train_miou",
                "train_iou_background",
                "train_iou_live",
                "train_iou_dead",
                "val_loss",
                "val_miou",
                "val_iou_background",
                "val_iou_live",
                "val_iou_dead",
            ],
        )
        writer.writeheader()
        writer.writerows(lightning_module.history_rows)

    best_checkpoint = torch.load(best_checkpoint_path, map_location=device, weights_only=False)
    lightning_module.model.load_state_dict(best_checkpoint["model_state_dict"])
    trainer.test(lightning_module, dataloaders=test_loader, verbose=False)
    if lightning_module.latest_test_metrics is None:
        raise RuntimeError("Lightning test loop did not produce metrics")
    test_metrics = lightning_module.latest_test_metrics
    save_json(
        test_metrics_path,
        {
            "loss": format_metric(test_metrics["loss"]),
            "miou": format_metric(test_metrics["miou"]),
            "iou_background": format_metric(test_metrics["iou_background"]),
            "iou_live": format_metric(test_metrics["iou_live"]),
            "iou_dead": format_metric(test_metrics["iou_dead"]),
        },
    )

    return TrainingArtifacts(
        run_dir=run_dir,
        best_checkpoint_path=best_checkpoint_path,
        last_checkpoint_path=last_checkpoint_path,
        config_path=config_path,
        metrics_csv_path=metrics_csv_path,
        test_metrics_path=test_metrics_path,
        train_split_path=train_split_path,
        val_split_path=val_split_path,
        test_split_path=test_split_path,
    )
