from __future__ import annotations

import csv
import json
import math
from pathlib import Path
from typing import Any

import torch
from torch import nn
from torch.utils.data import DataLoader

from .config import TrainingArtifacts, TrainingConfig
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
    fieldnames = [
        "split_folder",
        "image_relpath",
        "position",
        "roi",
        "time_index",
        "source_tif",
        "live_anchor_t",
        "dead_anchor_t",
        "dead_probability",
        "annotation_mode",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            writer.writerow(
                {
                    "split_folder": record.split_folder,
                    "image_relpath": record.image_relpath,
                    "position": record.position,
                    "roi": record.roi,
                    "time_index": record.time_index,
                    "source_tif": record.source_tif,
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

    model = build_model(pretrained=config.pretrained).to(device)
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
            threshold=config.threshold,
        )
        val_metrics = run_epoch(
            model,
            val_loader,
            optimizer=None,
            device=device,
            threshold=config.threshold,
        )
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
            last_checkpoint_path,
            model=model,
            config=config,
            epoch=epoch,
            metrics=combined_metrics,
        )
        if val_metrics["loss"] < best_val_loss:
            best_val_loss = val_metrics["loss"]
            save_checkpoint(
                best_checkpoint_path,
                model=model,
                config=config,
                epoch=epoch,
                metrics=combined_metrics,
            )

        history_rows.append(
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
        writer.writerows(history_rows)

    best_checkpoint = torch.load(best_checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(best_checkpoint["model_state_dict"])
    test_metrics = run_epoch(
        model,
        test_loader,
        optimizer=None,
        device=device,
        threshold=config.threshold,
    )
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
