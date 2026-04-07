from __future__ import annotations

import csv
from pathlib import Path

import pytest

from lisca.data.bbox import RoiBox, clip_roi, read_bbox_csv


def write_csv(path: Path, header: list[str], rows: list[list[int]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def test_read_bbox_csv_requires_roi_header(tmp_path: Path) -> None:
    csv_path = tmp_path / "bbox.csv"
    write_csv(csv_path, ["crop", "x", "y", "w", "h"], [[0, 1, 2, 3, 4]])

    with pytest.raises(ValueError, match="roi,x,y,w,h"):
        read_bbox_csv(csv_path)


def test_read_bbox_csv_parses_rows(tmp_path: Path) -> None:
    csv_path = tmp_path / "bbox.csv"
    write_csv(csv_path, ["roi", "x", "y", "w", "h"], [[7, 11, 13, 17, 19]])

    rois = read_bbox_csv(csv_path)

    assert rois == [RoiBox(roi=7, x=11, y=13, w=17, h=19)]


def test_clip_roi_clips_to_frame() -> None:
    y_slice, x_slice, clipped_w, clipped_h = clip_roi(
        RoiBox(roi=1, x=-3, y=1, w=7, h=5),
        height=4,
        width=5,
    )

    assert (y_slice.start, y_slice.stop) == (1, 4)
    assert (x_slice.start, x_slice.stop) == (0, 4)
    assert (clipped_w, clipped_h) == (4, 3)
