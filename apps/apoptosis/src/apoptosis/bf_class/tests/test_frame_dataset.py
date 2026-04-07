from __future__ import annotations

import csv
import json
from pathlib import Path

import tifffile

from apoptosis.bf_class.frame_dataset import convert_dataset


def write_annotation(annotation_dir: Path, file_name: str, label_id: str) -> None:
    annotation_dir.mkdir(parents=True, exist_ok=True)
    (annotation_dir / file_name).write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "classificationLabelId": label_id,
                "maskFileName": None,
                "updatedAt": "2026-04-04T00:00:00Z",
            }
        ),
        encoding="utf-8",
    )


def build_stack(time_count: int, roi_index: int) -> list[list[list[list[list[int]]]]]:
    stack: list[list[list[list[list[int]]]]] = []
    for time_index in range(time_count):
        channels: list[list[list[list[int]]]] = []
        for channel_index in range(2):
            plane = [
                [
                    roi_index * 1000 + time_index * 10 + channel_index,
                    roi_index * 1000 + time_index * 10 + channel_index + 1,
                ],
                [
                    roi_index * 1000 + time_index * 10 + channel_index + 2,
                    roi_index * 1000 + time_index * 10 + channel_index + 3,
                ],
            ]
            channels.append([plane])
        stack.append(channels)
    return stack


def write_fixture_dataset(root: Path) -> None:
    annotations_root = root / "annotations"
    roi_root = root / "roi" / "Pos0"
    roi_root.mkdir(parents=True)
    (annotations_root / "roi" / "Pos0").mkdir(parents=True)

    (annotations_root / "labels.json").write_text(
        json.dumps(
            {
                "labels": [
                    {"id": "l", "name": "live", "color": "#22c55e"},
                    {"id": "d", "name": "dead", "color": "#c42121"},
                ]
            }
        ),
        encoding="utf-8",
    )

    index_payload = {
        "position": 0,
        "axisOrder": "TCZYX",
        "pageOrder": ["t", "c", "z"],
        "timeCount": 241,
        "channelCount": 2,
        "zCount": 1,
        "rois": [
            {
                "roi": 0,
                "fileName": "Roi0.tif",
                "bbox": {"roi": 0, "x": 0, "y": 0, "w": 2, "h": 2},
                "shape": [241, 2, 1, 2, 2],
            },
            {
                "roi": 1,
                "fileName": "Roi1.tif",
                "bbox": {"roi": 1, "x": 0, "y": 0, "w": 2, "h": 2},
                "shape": [241, 2, 1, 2, 2],
            },
        ],
    }
    (roi_root / "index.json").write_text(json.dumps(index_payload), encoding="utf-8")

    tifffile.imwrite(roi_root / "Roi0.tif", build_stack(241, roi_index=0))
    tifffile.imwrite(roi_root / "Roi1.tif", build_stack(241, roi_index=1))

    write_annotation(annotations_root / "roi" / "Pos0" / "Roi0", "C0_T240_Z0.json", "l")
    write_annotation(annotations_root / "roi" / "Pos0" / "Roi1", "C0_T100_Z0.json", "l")
    write_annotation(annotations_root / "roi" / "Pos0" / "Roi1", "C1_T111_Z0.json", "d")


def read_rows(labels_csv: Path) -> list[dict[str, str]]:
    with labels_csv.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_convert_dataset_exports_c0_frames_and_soft_labels(tmp_path: Path) -> None:
    input_root = tmp_path / "input"
    output_root = tmp_path / "output"
    write_fixture_dataset(input_root)

    summary = convert_dataset(input_root, output_root, position="Pos0")

    assert summary.roi_count == 2
    assert summary.image_count == 482
    assert summary.live_count == 344
    assert summary.mixed_count == 6
    assert summary.dead_count == 132
    assert summary.warning_count == 1

    rows = read_rows(output_root / "labels.csv")
    assert len(rows) == 482

    roi0_rows = [row for row in rows if row["roi"] == "0"]
    assert all(row["split_folder"] == "live" for row in roi0_rows)
    assert all(row["dead_probability"] == "0.000000" for row in roi0_rows)

    roi1_rows = [row for row in rows if row["roi"] == "1"]
    by_time = {int(row["time_index"]): row for row in roi1_rows}
    assert by_time[100]["dead_probability"] == "0.000000"
    assert by_time[101]["dead_probability"] == "0.000000"
    assert by_time[102]["dead_probability"] == "0.000000"
    assert by_time[103]["dead_probability"] == "0.142857"
    assert by_time[105]["dead_probability"] == "0.428571"
    assert by_time[108]["dead_probability"] == "0.857143"
    assert by_time[109]["dead_probability"] == "1.000000"
    assert by_time[111]["dead_probability"] == "1.000000"
    assert by_time[103]["split_folder"] == "mixed"
    assert by_time[109]["split_folder"] == "dead"

    mixed_image = output_root / by_time[105]["image_relpath"]
    assert mixed_image.exists()
    exported = tifffile.imread(mixed_image)
    source = tifffile.imread(input_root / "roi" / "Pos0" / "Roi1.tif")
    assert exported.shape == (2, 2)
    assert exported.tolist() == source[105, 0, 0].tolist()
