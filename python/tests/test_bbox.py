from __future__ import annotations

from pathlib import Path

import pytest

from lisca.core.bbox import parse_bbox_csv


def test_parse_bbox_csv_requires_roi_header(tmp_path: Path) -> None:
    path = tmp_path / "Pos0.csv"
    path.write_text("roi,x,y,w,h\n1,0,0,2,2\n", encoding="utf-8")
    bboxes = parse_bbox_csv(path)
    assert len(bboxes) == 1
    assert bboxes[0].roi == 1
    assert (bboxes[0].x, bboxes[0].y, bboxes[0].w, bboxes[0].h) == (0, 0, 2, 2)


def test_parse_bbox_csv_accepts_crop_header_as_roi_alias(tmp_path: Path) -> None:
    path = tmp_path / "Pos0.csv"
    path.write_text("crop,x,y,w,h\n1,0,0,2,2\n", encoding="utf-8")
    bboxes = parse_bbox_csv(path)
    assert len(bboxes) == 1
    assert bboxes[0].roi == 1
    assert (bboxes[0].x, bboxes[0].y, bboxes[0].w, bboxes[0].h) == (0, 0, 2, 2)


def test_parse_bbox_csv_missing_roi_column(tmp_path: Path) -> None:
    path = tmp_path / "Pos0.csv"
    path.write_text("id,x,y,w,h\n1,0,0,2,2\n", encoding="utf-8")
    with pytest.raises(ValueError, match=r"required columns \(roi, x, y, w, h\)"):
        parse_bbox_csv(path)
