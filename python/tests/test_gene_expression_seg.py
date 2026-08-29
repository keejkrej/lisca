"""Tests for gene-expression fg/bg dataset, U-Net train, and ONNX export."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from lisca.core.mask_io import write_mask_png
from lisca.services.gene_expression_seg_dataset import (
    CreateGeneExpressionSegDatasetOptions,
    create_gene_expression_seg_dataset,
)

pytest.importorskip("lightning")

from lisca.models.gene_expression_seg_module import SmallUNet
from lisca.services.gene_expression_seg_train import (
    TrainGeneExpressionSegOptions,
    export_onnx,
    train_gene_expression_seg,
)


def _write_label_fixture(root: Path, *, n_positions: int = 3, n_roi: int = 2) -> Path:
    labels = root / "cpsam_labels"
    (labels / "images").mkdir(parents=True)
    (labels / "masks").mkdir(parents=True)
    samples: list[dict] = []
    for position in range(1, n_positions + 1):
        for roi in range(n_roi):
            key = f"Pos{position}_Roi{roi}_t0000"
            image = np.zeros((32, 32), dtype=np.uint8)
            image[8:24, 8:24] = 180
            mask = np.zeros((32, 32), dtype=np.uint8)
            mask[8:24, 8:24] = 1
            Image.fromarray(image, mode="L").save(labels / "images" / f"{key}.png")
            write_mask_png(mask, labels / "masks" / f"{key}.png")
            samples.append(
                {
                    "key": key,
                    "position": position,
                    "roi": roi,
                    "time": 0,
                    "image": f"images/{key}.png",
                    "mask": f"masks/{key}.png",
                    "height": 32,
                    "width": 32,
                    "fg_fraction": float(mask.mean()),
                    "cached": False,
                }
            )
    with (labels / "samples.jsonl").open("w", encoding="utf-8") as handle:
        for sample in samples:
            handle.write(json.dumps(sample) + "\n")
    (labels / "manifest.json").write_text(
        json.dumps({"counts": {"samples": len(samples)}}), encoding="utf-8"
    )
    return labels


def test_create_gene_expression_seg_dataset_splits_by_position(tmp_path: Path) -> None:
    labels = _write_label_fixture(tmp_path)
    output = tmp_path / "dataset"
    manifest = create_gene_expression_seg_dataset(
        CreateGeneExpressionSegDatasetOptions(
            labels=labels,
            output=output,
            val_positions=[3],
            seed=0,
        )
    )
    assert manifest["counts"]["train"] == 4
    assert manifest["counts"]["val"] == 2
    assert (output / "train" / "images").is_dir()
    assert (output / "val" / "masks").is_dir()
    assert (output / "samples.jsonl").is_file()


def test_small_unet_forward_shape() -> None:
    import torch

    model = SmallUNet(in_channels=3, base_channels=8)
    x = torch.randn(2, 3, 64, 64)
    y = model(x)
    assert y.shape == (2, 1, 64, 64)


def test_train_and_export_onnx(tmp_path: Path) -> None:
    labels = _write_label_fixture(tmp_path, n_positions=4, n_roi=2)
    dataset = tmp_path / "dataset"
    create_gene_expression_seg_dataset(
        CreateGeneExpressionSegDatasetOptions(
            labels=labels,
            output=dataset,
            val_positions=[4],
            seed=0,
        )
    )
    runs = tmp_path / "runs"
    result = train_gene_expression_seg(
        TrainGeneExpressionSegOptions(
            dataset=dataset,
            output=runs,
            epochs=1,
            batch_size=2,
            learning_rate=1e-3,
            image_size=32,
            base_channels=8,
            accelerator="cpu",
            seed=0,
        )
    )
    run_dir = Path(result["run_dir"])
    assert (run_dir / "model.onnx").is_file()
    assert (run_dir / "export_meta.json").is_file()
    assert (run_dir / "metrics.json").is_file()

    # Re-export from checkpoint to exercise export_onnx independently.
    export_path = tmp_path / "reexport.onnx"
    export_onnx(
        Path(result["best_checkpoint"]),
        export_path,
        image_size=32,
        base_channels=8,
    )
    assert export_path.is_file()
