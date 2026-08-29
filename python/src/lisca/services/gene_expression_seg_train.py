"""Train gene-expression fg/bg U-Net and export ONNX."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import lightning as L
import torch
from lightning.pytorch.callbacks import ModelCheckpoint

from lisca.core.image_preprocess import IMAGENET_MEAN, IMAGENET_STD
from lisca.models.gene_expression_seg_module import (
    GeneExpressionSegDataModule,
    GeneExpressionSegModule,
)
from lisca.services.gene_expression_seg_dataset import load_dataset_manifest


@dataclass(frozen=True)
class TrainGeneExpressionSegOptions:
    dataset: Path
    output: Path
    epochs: int = 40
    batch_size: int = 16
    learning_rate: float = 1e-3
    image_size: int = 128
    base_channels: int = 32
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


def export_onnx(
    checkpoint_path: Path,
    output_path: Path,
    *,
    image_size: int,
    base_channels: int = 32,
) -> None:
    module = GeneExpressionSegModule.load_from_checkpoint(
        str(checkpoint_path),
        map_location="cpu",
        base_channels=base_channels,
    )
    module.eval()
    module.cpu()
    model = module.model.cpu()
    dummy = torch.randn(1, 3, image_size, image_size, device="cpu")
    torch.onnx.export(
        model,
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


def train_gene_expression_seg(options: TrainGeneExpressionSegOptions) -> dict:
    L.seed_everything(options.seed, workers=True)

    manifest = load_dataset_manifest(options.dataset)
    run_dir = _run_output_dir(options.output)
    checkpoint_dir = run_dir / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    datamodule = GeneExpressionSegDataModule(
        options.dataset,
        batch_size=options.batch_size,
        image_size=options.image_size,
    )
    model = GeneExpressionSegModule(
        learning_rate=options.learning_rate,
        base_channels=options.base_channels,
    )

    checkpoint_callback = ModelCheckpoint(
        dirpath=str(checkpoint_dir),
        filename="best",
        monitor="val/dice",
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

    best_checkpoint = Path(
        checkpoint_callback.best_model_path or checkpoint_callback.last_model_path
    )
    if not best_checkpoint.is_file():
        raise RuntimeError("training finished without a saved checkpoint")

    metrics = _collect_logged_metrics(trainer)
    (run_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    hparams = {
        **asdict(options),
        "dataset": str(options.dataset),
        "output": str(options.output),
        "run_dir": str(run_dir),
        "best_checkpoint": str(best_checkpoint),
        "dataset_manifest": manifest,
    }
    (run_dir / "hparams.json").write_text(
        json.dumps(hparams, indent=2, default=str), encoding="utf-8"
    )

    onnx_path = run_dir / "model.onnx"
    export_onnx(
        best_checkpoint,
        onnx_path,
        image_size=options.image_size,
        base_channels=options.base_channels,
    )

    export_meta = {
        "task": "binary_semantic_segmentation",
        "labels": {"0": "background", "1": "foreground"},
        "image_size": options.image_size,
        "input_name": "pixel_values",
        "output_name": "logits",
        "output_layout": "NCHW",
        "output_channels": 1,
        "threshold": 0.5,
        "base_channels": options.base_channels,
        "preprocess": {
            "resize": options.image_size,
            "grayscale_to_rgb": True,
            "normalize": {
                "mean": list(IMAGENET_MEAN),
                "std": list(IMAGENET_STD),
            },
        },
        "postprocess": {
            "activation": "sigmoid",
            "threshold": 0.5,
            "resize_to_original": True,
            "fill_holes": True,
        },
    }
    (run_dir / "export_meta.json").write_text(
        json.dumps(export_meta, indent=2), encoding="utf-8"
    )

    return {
        "run_dir": str(run_dir),
        "best_checkpoint": str(best_checkpoint),
        "metrics": metrics,
        "onnx": str(onnx_path),
        "export_meta": export_meta,
    }
