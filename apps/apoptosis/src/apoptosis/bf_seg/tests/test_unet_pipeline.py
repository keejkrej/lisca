from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
import tifffile
import torch
from PIL import Image

from apoptosis.bf_seg.unet_pipeline import (
    TrainingConfig,
    extract_timelapse_frames,
    load_manifest,
    plot_readout_series,
    predict_timelapse,
    preprocess_tiff_image,
    split_records_by_roi,
    train_model,
)


def build_mask(size: int = 16) -> np.ndarray:
    mask = np.zeros((size, size), dtype=np.uint8)
    mask[:, size // 3 : 2 * size // 3] = 1
    mask[:, 2 * size // 3 :] = 2
    return mask


def build_image(mask: np.ndarray, *, shift: int = 0) -> np.ndarray:
    base = np.full(mask.shape, 1000 + shift, dtype=np.uint16)
    image = base + mask.astype(np.uint16) * 15000
    gradient = (np.arange(mask.shape[0], dtype=np.uint16).reshape(-1, 1) * 20)
    return image + gradient


def write_mask(path: Path, mask: np.ndarray) -> None:
    Image.fromarray(mask, mode="L").save(path)


def write_synthetic_dataset(dataset_root: Path, roi_count: int = 10) -> list[Path]:
    images_root = dataset_root / "images"
    masks_root = dataset_root / "masks"
    images_root.mkdir(parents=True, exist_ok=True)
    masks_root.mkdir(parents=True, exist_ok=True)

    labels_path = dataset_root / "labels.csv"
    sample_images: list[Path] = []
    mask = build_mask()
    with labels_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "image_relpath",
                "mask_relpath",
                "position",
                "roi",
                "time_index",
                "source_tif",
                "source_mask",
                "width",
                "height",
            ],
        )
        writer.writeheader()
        for roi in range(roi_count):
            for time_index in range(3):
                image_path = images_root / f"Pos0_Roi{roi}_T{time_index:03d}.tif"
                mask_path = masks_root / f"Pos0_Roi{roi}_T{time_index:03d}.png"
                image = build_image(mask, shift=roi * 50 + time_index * 10)
                tifffile.imwrite(image_path, image)
                write_mask(mask_path, mask)
                if roi == 0 and time_index == 0:
                    sample_images.append(image_path)
                writer.writerow(
                    {
                        "image_relpath": str(Path("images") / image_path.name).replace("/", "\\"),
                        "mask_relpath": str(Path("masks") / mask_path.name).replace("/", "\\"),
                        "position": "Pos0",
                        "roi": roi,
                        "time_index": time_index,
                        "source_tif": f"synthetic_roi_{roi}.tif",
                        "source_mask": f"synthetic_roi_{roi}.png",
                        "width": mask.shape[1],
                        "height": mask.shape[0],
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
                "shape": [3, 1, 1, 16, 16],
            }
        ]
    }
    (roi_root / "index.json").write_text(json.dumps(index_payload), encoding="utf-8")

    mask = build_mask()
    stack = np.stack(
        [
            build_image(mask, shift=0),
            build_image(mask, shift=10),
            build_image(mask, shift=20),
        ],
        axis=0,
    ).reshape(3, 1, 1, 16, 16)
    tif_path = roi_root / "Roi0.tif"
    tifffile.imwrite(tif_path, stack)
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


def test_preprocess_tiff_image_outputs_unet_tensor(tmp_path: Path) -> None:
    image_path = tmp_path / "sample.tif"
    tifffile.imwrite(image_path, build_image(build_mask()))

    tensor = preprocess_tiff_image(image_path, image_size=32)

    assert tensor.shape == (1, 32, 32)
    assert tensor.dtype == torch.float32
    assert bool(tensor.isfinite().all())


def test_extract_timelapse_frames_uses_sibling_index_for_channel_selection(tmp_path: Path) -> None:
    tif_path = write_raw_roi_timelapse(tmp_path / "roi" / "Pos0")

    frames = extract_timelapse_frames(tif_path, channel=0)

    assert frames.shape == (3, 16, 16)
    assert frames[0].tolist() == build_image(build_mask(), shift=0).tolist()
    assert frames[2].tolist() == build_image(build_mask(), shift=20).tolist()


def test_train_model_and_timelapse_inference_smoke(tmp_path: Path) -> None:
    dataset_root = tmp_path / "dataset"
    write_synthetic_dataset(dataset_root, roi_count=10)
    artifact_root = tmp_path / "artifacts"

    artifacts = train_model(
        TrainingConfig(
            dataset_root=dataset_root,
            artifact_root=artifact_root,
            run_name="testrun",
            epochs=1,
            batch_size=2,
            image_size=64,
            lr=1e-3,
            weight_decay=0.0,
            seed=123,
            num_workers=0,
            pretrained_encoder=False,
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

    metrics_payload = json.loads(artifacts.test_metrics_path.read_text(encoding="utf-8"))
    assert {"loss", "miou", "iou_background", "iou_live", "iou_dead"} <= set(metrics_payload)

    timelapse_tif = write_raw_roi_timelapse(tmp_path / "raw_roi" / "Pos0")
    timelapse_prediction = predict_timelapse(
        checkpoint_path=artifacts.best_checkpoint_path,
        tif_path=timelapse_tif,
        channel=0,
        device="cpu",
        output_csv_path=tmp_path / "readout.csv",
        mask_stack_path=tmp_path / "pred_masks.tif",
        batch_size=2,
    )
    assert timelapse_prediction.frame_count == 3
    assert timelapse_prediction.output_csv_path.exists()
    assert timelapse_prediction.mask_stack_path == (tmp_path / "pred_masks.tif")
    assert timelapse_prediction.mask_stack_path.exists()
    assert [row.time_index for row in timelapse_prediction.rows] == [0, 1, 2]
    for row in timelapse_prediction.rows:
        assert row.total_px == row.background_px + row.live_px + row.dead_px
        assert row.live_area_px == row.live_px
        assert 0.0 <= row.live_fraction <= 1.0
        assert row.killing_efficiency == 1.0 - row.live_fraction

    plot_path = plot_readout_series(
        timelapse_prediction.output_csv_path,
        output_png_path=tmp_path / "readout.png",
    )
    assert plot_path.exists()
    assert plot_path.stat().st_size > 0
