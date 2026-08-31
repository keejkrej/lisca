from __future__ import annotations

from pathlib import Path

import pytest

from lisca.core.bbox import RoiBbox, discover_bbox_positions, parse_bbox_csv
from lisca.core.paths import (
    ALIGN_DIR,
    ANALYSIS_DIR,
    ASSAY_JSON,
    BBOX_COLUMNS,
    BBOX_DIR,
    INDEX_JSON,
    MASK_DIR,
    RESULTS_DIR,
    ROI_DIR,
    bbox_csv_path,
    roi_index_path,
)
from lisca.core.workspace import load_bbox_rows, load_position_index


def test_workspace_folder_names() -> None:
    assert BBOX_DIR == "bbox"
    assert ROI_DIR == "roi"
    assert ALIGN_DIR == "align"
    assert MASK_DIR == "mask"
    assert ANALYSIS_DIR == "analysis"
    assert RESULTS_DIR == "results"
    assert ASSAY_JSON == "assay.json"
    assert INDEX_JSON == "index.json"
    assert BBOX_COLUMNS == ("roi", "x", "y", "w", "h")


def test_path_builders() -> None:
    root = Path("/tmp/ws")
    assert bbox_csv_path(root, 3) == root / "bbox" / "Pos3.csv"
    assert roi_index_path(root, 3) == root / "roi" / "Pos3" / "index.json"


def _write_bbox(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def test_parse_bbox_csv_reads_named_columns(tmp_path: Path) -> None:
    path = _write_bbox(
        tmp_path / "bbox" / "Pos1.csv",
        "h,w,y,x,roi\n4,3,2,1,7\n",
    )
    assert parse_bbox_csv(path) == [RoiBbox(roi=7, x=1, y=2, w=3, h=4)]


def test_parse_bbox_csv_ignores_extra_columns(tmp_path: Path) -> None:
    path = _write_bbox(
        tmp_path / "Pos1.csv",
        "roi,x,y,w,h,i,j\n0,1,2,3,4,9,8\n",
    )
    assert parse_bbox_csv(path) == [RoiBbox(roi=0, x=1, y=2, w=3, h=4)]


def test_parse_bbox_csv_rejects_crop_header_alias(tmp_path: Path) -> None:
    path = _write_bbox(tmp_path / "Pos1.csv", "crop,x,y,w,h\n0,1,2,3,4\n")
    with pytest.raises(ValueError, match="unsupported column `crop`"):
        parse_bbox_csv(path)


def test_parse_bbox_csv_rejects_empty_and_header_only(tmp_path: Path) -> None:
    empty = _write_bbox(tmp_path / "empty.csv", "")
    with pytest.raises(ValueError, match="empty"):
        parse_bbox_csv(empty)
    header_only = _write_bbox(tmp_path / "header.csv", "roi,x,y,w,h\n")
    with pytest.raises(ValueError, match="does not contain any ROI rows"):
        parse_bbox_csv(header_only)


def test_parse_bbox_csv_rejects_non_positive_size(tmp_path: Path) -> None:
    path = _write_bbox(tmp_path / "Pos1.csv", "roi,x,y,w,h\n0,1,2,0,4\n")
    with pytest.raises(ValueError, match="positive width and height"):
        parse_bbox_csv(path)


def test_load_bbox_rows_uses_parse_bbox_csv(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    _write_bbox(workspace / "bbox" / "Pos2.csv", "roi,x,y,w,h\n1,0,0,2,2\n0,4,4,3,3\n")
    rows = load_bbox_rows(workspace, 2)
    assert rows == [
        RoiBbox(roi=0, x=4, y=4, w=3, h=3),
        RoiBbox(roi=1, x=0, y=0, w=2, h=2),
    ]
    assert discover_bbox_positions(workspace) == [2]


def test_load_position_index_derives_shape_from_bbox(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    index_path = roi_index_path(workspace, 1)
    index_path.parent.mkdir(parents=True)
    index_path.write_text(
        '{"position":1,"axisOrder":"TCZYX","timeCount":2,"channelCount":3,'
        '"zCount":1,"timeIndices":[0,6],"rois":[{"roi":4,"fileName":"Roi4.tif",'
        '"bbox":{"roi":4,"x":1,"y":2,"w":8,"h":9}}]}\n',
        encoding="utf-8",
    )
    index = load_position_index(workspace, 1)
    assert index.time_count == 2
    assert index.channel_count == 3
    assert index.z_count == 1
    assert index.time_indices == [0, 6]
    assert len(index.rois) == 1
    entry = index.rois[0]
    assert entry.roi == 4
    assert entry.file_name == "Roi4.tif"
    assert entry.shape == (2, 3, 1, 9, 8)
    assert entry.bbox == RoiBbox(roi=4, x=1, y=2, w=8, h=9)
