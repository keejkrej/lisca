from __future__ import annotations

import csv
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader

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
) -> DataLoader[tuple[torch.Tensor, torch.Tensor]]:
    dataset = SegmentationDataset(records=records, image_size=image_size)
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
            loss = loss_fn(logits, batch_targets)
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


def make_run_dir(artifact_root: Path, run_name: str | None) -> Path:
    resolved_root = artifact_root.resolve()
    resolved_root.mkdir(parents=True, exist_ok=True)
    run_dir = resolved_root / (run_name or default_run_name())
    run_dir.mkdir(parents=True, exist_ok=False)
    return run_dir


def write_split_manifest(path: Path, records: list[ExampleRecord]) -> None:
    fieldnames = [
        "image_relpath",
        "mask_relpath",
        "position",
        "roi",
        "time_index",
        "source_tif",
        "source_mask",
        "width",
        "height",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            writer.writerow(
                {
                    "image_relpath": record.image_relpath,
                    "mask_relpath": record.mask_relpath,
                    "position": record.position,
                    "roi": record.roi,
                    "time_index": record.time_index,
                    "source_tif": record.source_tif,
                    "source_mask": record.source_mask,
                    "width": record.width,
                    "height": record.height,
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


def train_model(config: TrainingConfig) -> TrainingArtifacts:
    set_seed(config.seed)
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

    model = build_model().to(device)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.lr,
        weight_decay=config.weight_decay,
    )

    best_val_loss = float("inf")
    history_rows: list[dict[str, str | int]] = []

    for epoch in range(1, config.epochs + 1):
        train_metrics = run_epoch(
            model,
            train_loader,
            optimizer=optimizer,
            device=device,
            class_weights=class_weights,
        )
        val_metrics = run_epoch(
            model,
            val_loader,
            optimizer=None,
            device=device,
            class_weights=class_weights,
        )
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
        }
        save_checkpoint(
            last_checkpoint_path,
            model=model,
            config=config,
            epoch=epoch,
            metrics=combined_metrics,
            class_weights=class_weights,
        )
        if val_metrics["loss"] < best_val_loss:
            best_val_loss = val_metrics["loss"]
            save_checkpoint(
                best_checkpoint_path,
                model=model,
                config=config,
                epoch=epoch,
                metrics=combined_metrics,
                class_weights=class_weights,
            )

        history_rows.append(
            {
                "epoch": epoch,
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

    with metrics_csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "epoch",
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
        writer.writerows(history_rows)

    best_checkpoint = torch.load(best_checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(best_checkpoint["model_state_dict"])
    test_metrics = run_epoch(
        model,
        test_loader,
        optimizer=None,
        device=device,
        class_weights=class_weights,
    )
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
