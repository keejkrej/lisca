from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest
from PIL import Image

pytest.importorskip("lightning")

import lightning as L

from lisca.models.smart_exclusion_module import SmartExclusionDataModule, SmartExclusionModule
from lisca.services.smart_exclusion_train import (
    TrainSmartExclusionOptions,
    export_onnx,
    train_smart_exclusion,
)


def _write_sample(
    root: Path,
    *,
    split: str,
    label: int,
    name: str,
) -> None:
    folder = root / ("include" if label == 1 else "exclude")
    folder.mkdir(parents=True, exist_ok=True)
    Image.new("L", (100, 100), color=128).save(folder / name)


def _write_fixture_dataset(tmp_path: Path) -> Path:
    dataset_root = tmp_path / "dataset"
    include_dir = dataset_root / "include"
    exclude_dir = dataset_root / "exclude"
    include_dir.mkdir(parents=True)
    exclude_dir.mkdir(parents=True)

    _write_sample(dataset_root, split="train", label=1, name="train_include.png")
    _write_sample(dataset_root, split="train", label=0, name="train_exclude.png")
    _write_sample(dataset_root, split="val", label=1, name="val_include.png")
    _write_sample(dataset_root, split="val", label=0, name="val_exclude.png")

    rows = [
        {
            "path": "include/train_include.png",
            "label": "1",
            "position": "1",
            "i": "0",
            "j": "0",
            "roi": "0",
            "split": "train",
            "source_kind": "roi_stack",
            "area_ratio": "1.0",
        },
        {
            "path": "exclude/train_exclude.png",
            "label": "0",
            "position": "1",
            "i": "1",
            "j": "0",
            "roi": "",
            "split": "train",
            "source_kind": "source_crop",
            "area_ratio": "1.0",
        },
        {
            "path": "include/val_include.png",
            "label": "1",
            "position": "2",
            "i": "0",
            "j": "0",
            "roi": "0",
            "split": "val",
            "source_kind": "roi_stack",
            "area_ratio": "1.0",
        },
        {
            "path": "exclude/val_exclude.png",
            "label": "0",
            "position": "2",
            "i": "1",
            "j": "0",
            "roi": "",
            "split": "val",
            "source_kind": "source_crop",
            "area_ratio": "1.0",
        },
    ]

    with (dataset_root / "metadata.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    manifest = {
        "version": 1,
        "train_positions": [1],
        "val_positions": [2],
        "counts": {"include": 2, "exclude": 2, "total": 4},
    }
    (dataset_root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return dataset_root


def test_train_smart_exclusion_smoke(tmp_path: Path) -> None:
    dataset_root = _write_fixture_dataset(tmp_path)
    output_root = tmp_path / "runs"

    result = train_smart_exclusion(
        TrainSmartExclusionOptions(
            dataset=dataset_root,
            output=output_root,
            epochs=1,
            batch_size=2,
            image_size=224,
            accelerator="cpu",
            seed=7,
        )
    )

    run_dir = Path(result["run_dir"])
    assert (run_dir / "metrics.json").is_file()
    assert (run_dir / "hparams.json").is_file()
    assert (run_dir / "export_meta.json").is_file()
    assert (run_dir / "model.onnx").is_file()
    assert Path(result["best_checkpoint"]).is_file()


def test_smart_exclusion_module_fit_one_epoch(tmp_path: Path) -> None:
    dataset_root = _write_fixture_dataset(tmp_path)
    datamodule = SmartExclusionDataModule(
        dataset_root,
        batch_size=2,
        image_size=224,
    )
    model = SmartExclusionModule(learning_rate=1e-4)
    trainer = L.Trainer(
        max_epochs=1,
        accelerator="cpu",
        devices=1,
        enable_progress_bar=False,
        logger=False,
    )
    trainer.fit(model, datamodule=datamodule)

    checkpoint_dir = tmp_path / "checkpoints"
    checkpoint_dir.mkdir()
    checkpoint_path = checkpoint_dir / "best.ckpt"
    trainer.save_checkpoint(str(checkpoint_path))
    export_onnx(checkpoint_path, tmp_path / "model.onnx", image_size=224)
    assert (tmp_path / "model.onnx").is_file()
