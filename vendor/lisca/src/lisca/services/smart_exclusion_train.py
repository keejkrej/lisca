from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import lightning as L
import torch
from lightning.pytorch.callbacks import ModelCheckpoint

from lisca.core.smart_exclusion_dataset_reader import load_dataset_manifest
from lisca.models.smart_exclusion_module import SmartExclusionDataModule, SmartExclusionModule


@dataclass(frozen=True)
class TrainSmartExclusionOptions:
    dataset: Path
    output: Path
    epochs: int = 25
    batch_size: int = 32
    learning_rate: float = 1e-4
    image_size: int = 224
    accelerator: str = "auto"
    seed: int = 42


def _run_output_dir(output: Path) -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    run_dir = output / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def _collect_logged_metrics(trainer: L.Trainer) -> dict[str, float | None]:
    metrics: dict[str, float | None] = {}
    for key, value in trainer.callback_metrics.items():
        if value is None:
            metrics[key] = None
            continue
        if hasattr(value, "item"):
            metrics[key] = float(value.item())
        else:
            metrics[key] = float(value)
    return metrics


def export_onnx(checkpoint_path: Path, output_path: Path, *, image_size: int) -> None:
    module = SmartExclusionModule.load_from_checkpoint(str(checkpoint_path), map_location="cpu")
    module.eval()
    module.cpu()
    backbone = module.model.cpu()
    dummy = torch.randn(1, 3, image_size, image_size, device="cpu")
    torch.onnx.export(
        backbone,
        dummy,
        str(output_path),
        input_names=["pixel_values"],
        output_names=["logits"],
        dynamic_axes={
            "pixel_values": {0: "batch"},
            "logits": {0: "batch"},
        },
        opset_version=17,
        dynamo=False,
    )


def train_smart_exclusion(options: TrainSmartExclusionOptions) -> dict:
    L.seed_everything(options.seed, workers=True)

    manifest = load_dataset_manifest(options.dataset)
    run_dir = _run_output_dir(options.output)
    checkpoint_dir = run_dir / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    datamodule = SmartExclusionDataModule(
        options.dataset,
        batch_size=options.batch_size,
        image_size=options.image_size,
    )
    model = SmartExclusionModule(learning_rate=options.learning_rate)

    checkpoint_callback = ModelCheckpoint(
        dirpath=str(checkpoint_dir),
        filename="best",
        monitor="val/f1_exclude",
        mode="max",
        save_top_k=1,
        save_last=True,
    )

    trainer = L.Trainer(
        max_epochs=options.epochs,
        accelerator=options.accelerator,
        devices=1,
        callbacks=[checkpoint_callback],
        enable_progress_bar=True,
        log_every_n_steps=10,
        default_root_dir=str(run_dir),
    )

    trainer.fit(model, datamodule=datamodule)

    best_checkpoint = Path(checkpoint_callback.best_model_path or checkpoint_callback.last_model_path)
    if not best_checkpoint.is_file():
        msg = "training finished without a saved checkpoint"
        raise RuntimeError(msg)

    metrics = _collect_logged_metrics(trainer)
    metrics_path = run_dir / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    hparams = {
        **asdict(options),
        "dataset": str(options.dataset),
        "output": str(options.output),
        "run_dir": str(run_dir),
        "best_checkpoint": str(best_checkpoint),
        "dataset_manifest": manifest,
    }
    hparams_path = run_dir / "hparams.json"
    hparams_path.write_text(json.dumps(hparams, indent=2, default=str), encoding="utf-8")

    onnx_path = run_dir / "model.onnx"
    export_onnx(best_checkpoint, onnx_path, image_size=options.image_size)

    export_meta = {
        "labels": {
            "0": "exclude",
            "1": "include",
        },
        "image_size": options.image_size,
        "input_name": "pixel_values",
        "output_name": "logits",
        "preprocess": {
            "resize": options.image_size,
            "grayscale_to_rgb": True,
            "normalize": {
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
            },
        },
    }
    export_meta_path = run_dir / "export_meta.json"
    export_meta_path.write_text(json.dumps(export_meta, indent=2), encoding="utf-8")

    return {
        "run_dir": str(run_dir),
        "best_checkpoint": str(best_checkpoint),
        "metrics": metrics,
        "onnx": str(onnx_path),
    }
