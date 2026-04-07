from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
import tifffile
import torch

from apoptosis.bf_class.resnet_pipeline import (
    TrainingConfig,
    extract_timelapse_frames,
    load_manifest,
    plot_score_series,
    predict_single_image,
    predict_timelapse,
    preprocess_tiff_image,
    split_records_by_roi,
    train_model,
)


def build_image(dead_probability: float) -> np.ndarray:
    base = np.full((16, 16), int(dead_probability * 40000), dtype=np.uint16)
    gradient = np.arange(16, dtype=np.uint16).reshape(16, 1) * 200
    return base + gradient


def write_synthetic_dataset(dataset_root: Path, roi_count: int = 10) -> list[Path]:
    images_root = dataset_root / "images"
    for folder in ("live", "mixed", "dead"):
        (images_root / folder).mkdir(parents=True, exist_ok=True)

    labels_path = dataset_root / "labels.csv"
    sample_images: list[Path] = []
    with labels_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
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
            ],
        )
        writer.writeheader()
        for roi in range(roi_count):
            for time_index, dead_probability in enumerate((0.0, 0.5, 1.0)):
                if dead_probability <= 0.0:
                    split_folder = "live"
                elif dead_probability >= 1.0:
                    split_folder = "dead"
                else:
                    split_folder = "mixed"
                file_name = f"Pos0_Roi{roi}_T{time_index:03d}.tif"
                image_path = images_root / split_folder / file_name
                tifffile.imwrite(image_path, build_image(dead_probability))
                if roi == 0 and time_index == 0:
                    sample_images.append(image_path)
                writer.writerow(
                    {
                        "split_folder": split_folder,
                        "image_relpath": str(Path("images") / split_folder / file_name).replace("/", "\\"),
                        "position": "Pos0",
                        "roi": roi,
                        "time_index": time_index,
                        "source_tif": f"synthetic_roi_{roi}.tif",
                        "live_anchor_t": 0,
                        "dead_anchor_t": 2,
                        "dead_probability": f"{dead_probability:.6f}",
                        "annotation_mode": "live_to_dead",
                    }
                )
    return sample_images


def write_raw_roi_timelapse(roi_root: Path) -> Path:
    roi_root.mkdir(parents=True, exist_ok=True)
    index_payload = {
        "rois": [
            {
                "roi": 0,
                "fileName": "Roi0.tif",
                "shape": [3, 2, 1, 16, 16],
            }
        ]
    }
    (roi_root / "index.json").write_text(json.dumps(index_payload), encoding="utf-8")

    pages: list[np.ndarray] = []
    for time_index in range(3):
        pages.append(build_image(dead_probability=time_index / 2.0))
        pages.append(build_image(dead_probability=0.9 - time_index * 0.2))
    tif_path = roi_root / "Roi0.tif"
    tifffile.imwrite(tif_path, np.stack(pages, axis=0))
    return tif_path


def test_split_records_by_roi_keeps_groups_isolated(tmp_path: Path) -> None:
    dataset_root = tmp_path / "dataset"
    write_synthetic_dataset(dataset_root, roi_count=10)
    records = load_manifest(dataset_root)

    split_map = split_records_by_roi(records, seed=7)
    train_groups = {record.roi_group for record in split_map["train"]}
    val_groups = {record.roi_group for record in split_map["val"]}
    test_groups = {record.roi_group for record in split_map["test"]}

    assert train_groups.isdisjoint(val_groups)
    assert train_groups.isdisjoint(test_groups)
    assert val_groups.isdisjoint(test_groups)
    assert len(train_groups | val_groups | test_groups) == 10


def test_preprocess_tiff_image_outputs_resnet_tensor(tmp_path: Path) -> None:
    image_path = tmp_path / "sample.tif"
    tifffile.imwrite(image_path, build_image(0.5))

    tensor = preprocess_tiff_image(image_path, image_size=64)

    assert tensor.shape == (3, 64, 64)
    assert tensor.dtype == torch.float32
    assert bool(tensor.isfinite().all())


def test_extract_timelapse_frames_uses_sibling_index_for_channel_selection(tmp_path: Path) -> None:
    tif_path = write_raw_roi_timelapse(tmp_path / "roi" / "Pos0")

    frames = extract_timelapse_frames(tif_path, channel=0)

    assert frames.shape == (3, 16, 16)
    assert frames[0].tolist() == build_image(0.0).tolist()
    assert frames[1].tolist() == build_image(0.5).tolist()
    assert frames[2].tolist() == build_image(1.0).tolist()


def test_train_model_and_single_image_inference_smoke(tmp_path: Path) -> None:
    dataset_root = tmp_path / "dataset"
    sample_images = write_synthetic_dataset(dataset_root, roi_count=10)
    artifact_root = tmp_path / "artifacts"

    artifacts = train_model(
        TrainingConfig(
            dataset_root=dataset_root,
            artifact_root=artifact_root,
            run_name="testrun",
            epochs=1,
            batch_size=4,
            image_size=64,
            lr=1e-3,
            weight_decay=0.0,
            seed=123,
            num_workers=0,
            pretrained=False,
            device="cpu",
        )
    )

    assert artifacts.run_dir.exists()
    assert artifacts.best_checkpoint_path.exists()
    assert artifacts.last_checkpoint_path.exists()
    assert artifacts.metrics_csv_path.exists()
    assert artifacts.test_metrics_path.exists()
    assert artifacts.train_split_path.exists()
    assert artifacts.val_split_path.exists()
    assert artifacts.test_split_path.exists()

    prediction = predict_single_image(
        checkpoint_path=artifacts.best_checkpoint_path,
        image_path=sample_images[0],
        device="cpu",
    )
    assert 0.0 <= prediction.dead_probability <= 1.0
    assert prediction.hard_label in {"live", "dead"}

    timelapse_tif = write_raw_roi_timelapse(tmp_path / "raw_roi" / "Pos0")
    timelapse_prediction = predict_timelapse(
        checkpoint_path=artifacts.best_checkpoint_path,
        tif_path=timelapse_tif,
        channel=0,
        device="cpu",
        output_csv_path=tmp_path / "scores.csv",
        batch_size=2,
    )
    assert timelapse_prediction.frame_count == 3
    assert timelapse_prediction.output_csv_path.exists()
    assert [row.time_index for row in timelapse_prediction.rows] == [0, 1, 2]
    assert all(0.0 <= row.dead_probability <= 1.0 for row in timelapse_prediction.rows)

    plot_path = plot_score_series(timelapse_prediction.output_csv_path, output_png_path=tmp_path / "scores.png")
    assert plot_path.exists()
    assert plot_path.stat().st_size > 0
