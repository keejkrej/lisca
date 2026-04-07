from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

from apoptosis.bf_seg.seg_dataset import convert_dataset


def write_mask(mask_path: Path, mask: np.ndarray) -> None:
    mask_path.parent.mkdir(parents=True, exist_ok=True)
    rgba = np.zeros((mask.shape[0], mask.shape[1], 4), dtype=np.uint8)
    rgba[:, :, 0] = mask
    rgba[:, :, 1] = mask
    rgba[:, :, 2] = mask
    rgba[:, :, 3] = 255
    Image.fromarray(rgba, mode="RGBA").save(mask_path)


def build_stack(time_count: int, width: int, height: int) -> np.ndarray:
    stack = np.zeros((time_count, 1, 1, height, width), dtype=np.uint16)
    for time_index in range(time_count):
        stack[time_index, 0, 0] = (time_index + 1) * 100 + np.arange(width * height, dtype=np.uint16).reshape(height, width)
    return stack


def write_fixture_dataset(root: Path, *, bad_mask: bool = False) -> None:
    annotations_root = root / "annotations" / "roi" / "Pos0" / "Roi0"
    roi_root = root / "roi" / "Pos0"
    roi_root.mkdir(parents=True)
    annotations_root.mkdir(parents=True)

    index_payload = {
        "position": 0,
        "axisOrder": "TCZYX",
        "pageOrder": ["t", "c", "z"],
        "timeCount": 4,
        "channelCount": 1,
        "zCount": 1,
        "rois": [
            {
                "roi": 0,
                "fileName": "Roi0.tif",
                "bbox": {"roi": 0, "x": 0, "y": 0, "w": 5, "h": 4},
                "shape": [4, 1, 1, 4, 5],
            }
        ],
    }
    (roi_root / "index.json").write_text(json.dumps(index_payload), encoding="utf-8")
    tifffile.imwrite(roi_root / "Roi0.tif", build_stack(4, width=5, height=4))

    mask0 = np.array(
        [
            [0, 0, 1, 1, 2],
            [0, 1, 1, 2, 2],
            [0, 1, 2, 2, 2],
            [0, 0, 1, 1, 2],
        ],
        dtype=np.uint8,
    )
    mask2 = np.flipud(mask0)
    if bad_mask:
        mask2 = mask2.copy()
        mask2[0, 0] = 9

    write_mask(annotations_root / "C0_T0_Z0.png", mask0)
    write_mask(annotations_root / "C0_T2_Z0.png", mask2)
    for time_index in (0, 2):
        (annotations_root / f"C0_T{time_index}_Z0.json").write_text(
            json.dumps(
                {
                    "schemaVersion": 1,
                    "classificationLabelId": None,
                    "maskFileName": f"C0_T{time_index}_Z0.png",
                    "updatedAt": "2026-04-06T00:00:00Z",
                }
            ),
            encoding="utf-8",
        )


def read_rows(labels_csv: Path) -> list[dict[str, str]]:
    with labels_csv.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_convert_dataset_exports_only_annotated_frames(tmp_path: Path) -> None:
    input_root = tmp_path / "input"
    output_root = tmp_path / "output"
    write_fixture_dataset(input_root)

    summary = convert_dataset(input_root, output_root)

    assert summary.annotated_frame_count == 2
    assert summary.position_count == 1
    assert summary.roi_count == 1

    rows = read_rows(output_root / "labels.csv")
    assert len(rows) == 2
    assert {row["time_index"] for row in rows} == {"0", "2"}

    exported_image = tifffile.imread(output_root / rows[0]["image_relpath"])
    exported_mask = np.asarray(Image.open(output_root / rows[0]["mask_relpath"]))
    if exported_mask.ndim == 3:
        exported_mask = exported_mask[:, :, 0]
    assert exported_image.shape == exported_mask.shape == (4, 5)
    assert set(np.unique(exported_mask).tolist()) == {0, 1, 2}


def test_convert_dataset_rejects_unknown_mask_values(tmp_path: Path) -> None:
    input_root = tmp_path / "input"
    output_root = tmp_path / "output"
    write_fixture_dataset(input_root, bad_mask=True)

    try:
        convert_dataset(input_root, output_root)
    except ValueError as exc:
        assert "unsupported class ids" in str(exc)
    else:
        raise AssertionError("Expected convert_dataset to fail on mask value 9")
