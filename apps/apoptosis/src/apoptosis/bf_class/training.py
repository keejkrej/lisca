from __future__ import annotations

import csv
import json
import math
from pathlib import Path
from typing import Any

import lightning as L
import torch
from torch import nn
from torch.utils.data import DataLoader

from lisca.data.manifest import UNIFIED_LABEL_FIELDS

from .config import TrainingArtifacts, TrainingConfig, default_run_name
from .manifest import ExampleRecord, load_manifest, split_records_by_roi
from .model import ApoptosisFrameDataset, build_model, choose_device, set_seed


def build_dataloader(
    records: list[ExampleRecord],
    *,
    image_size: int,
    batch_size: int,
    shuffle: bool,
    num_workers: int,
) -> DataLoader[tuple[torch.Tensor, torch.Tensor]]:
    dataset = ApoptosisFrameDataset(records=records, image_size=image_size)
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )


def binary_accuracy(probabilities: list[float], targets: list[float], threshold: float) -> float:
    hard_targets = [1.0 if target >= threshold else 0.0 for target in targets]
    hard_predictions = [1.0 if probability >= threshold else 0.0 for probability in probabilities]
    correct = sum(int(prediction == target) for prediction, target in zip(hard_predictions, hard_targets))
    return correct / len(probabilities)


def binary_auroc(probabilities: list[float], targets: list[float], threshold: float) -> float:
    hard_targets = [1 if target >= threshold else 0 for target in targets]
    positives = sum(hard_targets)
    negatives = len(hard_targets) - positives
    if positives == 0 or negatives == 0:
        return float("nan")

    paired = sorted(zip(probabilities, hard_targets), key=lambda item: item[0], reverse=True)
    true_positives = 0
    false_positives = 0
    points: list[tuple[float, float]] = [(0.0, 0.0)]
    previous_score: float | None = None

    for score, label in paired:
        if previous_score is not None and score != previous_score:
            points.append((false_positives / negatives, true_positives / positives))
        if label == 1:
            true_positives += 1
        else:
            false_positives += 1
        previous_score = score
    points.append((false_positives / negatives, true_positives / positives))

    auc = 0.0
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        auc += (x1 - x0) * (y0 + y1) * 0.5
    return auc


def summarize_epoch(
    *,
    probabilities: list[float],
    targets: list[float],
    average_loss: float,
    threshold: float,
) -> dict[str, float]:
    mae = sum(abs(probability - target) for probability, target in zip(probabilities, targets)) / len(probabilities)
    return {
        "loss": average_loss,
        "mae": mae,
        "accuracy": binary_accuracy(probabilities, targets, threshold=threshold),
        "auroc": binary_auroc(probabilities, targets, threshold=threshold),
    }


def run_epoch(
    model: nn.Module,
    dataloader: DataLoader[tuple[torch.Tensor, torch.Tensor]],
    *,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    threshold: float,
) -> dict[str, float]:
    loss_fn = nn.BCEWithLogitsLoss()
    training = optimizer is not None
    if training:
        model.train()
    else:
        model.eval()

    total_examples = 0
    total_loss = 0.0
    probabilities: list[float] = []
    targets: list[float] = []

    for images, batch_targets in dataloader:
        images = images.to(device)
        batch_targets = batch_targets.to(device)

        with torch.set_grad_enabled(training):
            logits = model(images).squeeze(1)
            loss = loss_fn(logits, batch_targets)
            if training:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

        batch_size = images.shape[0]
        total_examples += batch_size
        total_loss += float(loss.detach().cpu()) * batch_size
        probabilities.extend(float(value) for value in torch.sigmoid(logits).detach().cpu().tolist())
        targets.extend(float(value) for value in batch_targets.detach().cpu().tolist())

    if total_examples == 0:
        raise ValueError("Dataloader produced zero examples")

    return summarize_epoch(
        probabilities=probabilities,
        targets=targets,
        average_loss=total_loss / total_examples,
        threshold=threshold,
    )


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
                    "mask_relpath": "",
                    "target_type": "classification",
                    "split_folder": record.split_folder,
                    "position": record.position,
                    "roi": record.roi,
                    "time_index": record.time_index,
                    "source_tif": record.source_tif,
                    "source_mask": "",
                    "width": "",
                    "height": "",
                    "live_anchor_t": record.live_anchor_t,
                    "dead_anchor_t": "" if record.dead_anchor_t is None else record.dead_anchor_t,
                    "dead_probability": f"{record.dead_probability:.6f}",
                    "annotation_mode": record.annotation_mode,
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
) -> None:
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "config": config.to_dict(),
            "epoch": epoch,
            "metrics": metrics,
        },
        path,
    )


def summarize_split(records: list[ExampleRecord]) -> dict[str, int]:
    return {
        "frames": len(records),
        "rois": len({record.roi_group for record in records}),
        "live_frames": sum(1 for record in records if record.dead_probability <= 0.0),
        "mixed_frames": sum(1 for record in records if 0.0 < record.dead_probability < 1.0),
        "dead_frames": sum(1 for record in records if record.dead_probability >= 1.0),
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


class ClassificationLightningModule(L.LightningModule):
    def __init__(
        self,
        *,
        config: TrainingConfig,
        best_checkpoint_path: Path,
        last_checkpoint_path: Path,
    ) -> None:
        super().__init__()
        self.config = config
        self.best_checkpoint_path = best_checkpoint_path
        self.last_checkpoint_path = last_checkpoint_path
        self.model = build_model(pretrained=config.pretrained)
        self.loss_fn = nn.BCEWithLogitsLoss()
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

    def configure_optimizers(self) -> torch.optim.Optimizer:
        return torch.optim.AdamW(
            self.model.parameters(),
            lr=self.config.lr,
            weight_decay=self.config.weight_decay,
        )

    def _reset_epoch_buffers(self, stage: str) -> None:
        setattr(self, f"_{stage}_total_examples", 0)
        setattr(self, f"_{stage}_total_loss", 0.0)
        setattr(self, f"_{stage}_probabilities", [])
        setattr(self, f"_{stage}_targets", [])

    def _shared_step(self, batch: tuple[torch.Tensor, torch.Tensor], stage: str) -> torch.Tensor:
        images, batch_targets = batch
        logits = self(images).squeeze(1)
        loss = self.loss_fn(logits, batch_targets)
        batch_size = int(images.shape[0])
        setattr(self, f"_{stage}_total_examples", getattr(self, f"_{stage}_total_examples") + batch_size)
        setattr(
            self,
            f"_{stage}_total_loss",
            getattr(self, f"_{stage}_total_loss") + float(loss.detach().cpu()) * batch_size,
        )
        getattr(self, f"_{stage}_probabilities").extend(
            float(value) for value in torch.sigmoid(logits).detach().cpu().tolist()
        )
        getattr(self, f"_{stage}_targets").extend(
            float(value) for value in batch_targets.detach().cpu().tolist()
        )
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
        return summarize_epoch(
            probabilities=getattr(self, f"_{stage}_probabilities"),
            targets=getattr(self, f"_{stage}_targets"),
            average_loss=float(getattr(self, f"_{stage}_total_loss")) / total_examples,
            threshold=self.config.threshold,
        )

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
        combined_metrics = {
            "train_loss": train_metrics["loss"],
            "train_mae": train_metrics["mae"],
            "train_accuracy": train_metrics["accuracy"],
            "train_auroc": train_metrics["auroc"],
            "val_loss": val_metrics["loss"],
            "val_mae": val_metrics["mae"],
            "val_accuracy": val_metrics["accuracy"],
            "val_auroc": val_metrics["auroc"],
        }
        save_checkpoint(
            self.last_checkpoint_path,
            model=self.model,
            config=self.config,
            epoch=epoch,
            metrics=combined_metrics,
        )
        if val_metrics["loss"] < self.best_val_loss:
            self.best_val_loss = val_metrics["loss"]
            save_checkpoint(
                self.best_checkpoint_path,
                model=self.model,
                config=self.config,
                epoch=epoch,
                metrics=combined_metrics,
            )

        self.history_rows.append(
            {
                "epoch": epoch,
                "train_loss": format_metric(train_metrics["loss"]),
                "train_mae": format_metric(train_metrics["mae"]),
                "train_accuracy": format_metric(train_metrics["accuracy"]),
                "train_auroc": format_metric(train_metrics["auroc"]),
                "val_loss": format_metric(val_metrics["loss"]),
                "val_mae": format_metric(val_metrics["mae"]),
                "val_accuracy": format_metric(val_metrics["accuracy"]),
                "val_auroc": format_metric(val_metrics["auroc"]),
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

    save_json(
        config_path,
        {
            **config.to_dict(),
            "device_resolved": str(device),
            "split_summary": {
                split_name: summarize_split(split_records)
                for split_name, split_records in split_map.items()
            },
        },
    )

    train_loader = build_dataloader(
        split_map["train"],
        image_size=config.image_size,
        batch_size=config.batch_size,
        shuffle=True,
        num_workers=config.num_workers,
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

    lightning_module = ClassificationLightningModule(
        config=config,
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
                "train_loss",
                "train_mae",
                "train_accuracy",
                "train_auroc",
                "val_loss",
                "val_mae",
                "val_accuracy",
                "val_auroc",
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
            "mae": format_metric(test_metrics["mae"]),
            "accuracy": format_metric(test_metrics["accuracy"]),
            "auroc": format_metric(test_metrics["auroc"]),
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
