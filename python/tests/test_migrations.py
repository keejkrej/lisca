from __future__ import annotations

from pathlib import Path

import pytest

from lisca.core.bbox import parse_bbox_csv
from lisca.core.workspace import load_bbox_rows
from lisca.migrations import migrate_workspace
from lisca.services import crop


def _write_bbox(workspace: Path, name: str, contents: str) -> Path:
    bbox_dir = workspace / "bbox"
    bbox_dir.mkdir(parents=True)
    path = bbox_dir / name
    path.write_text(contents, encoding="utf-8")
    return path


def test_migrate_rewrites_crop_header_to_roi_and_keeps_rows(tmp_path: Path) -> None:
    path = _write_bbox(
        tmp_path, "Pos0.csv", "crop,x,y,w,h,i,j\n5,1,2,3,4,0,1\n1,0,0,1,1,0,0\n"
    )

    rewritten = migrate_workspace(tmp_path)

    assert rewritten == [str(path.resolve())]
    assert (
        path.read_text(encoding="utf-8")
        == "roi,x,y,w,h,i,j\n5,1,2,3,4,0,1\n1,0,0,1,1,0,0\n"
    )
    bboxes = parse_bbox_csv(path)
    assert [bbox.roi for bbox in bboxes] == [1, 5]


def test_migrate_is_noop_for_roi_header(tmp_path: Path) -> None:
    original = "roi,x,y,w,h,i,j\n0,1,2,3,4,0,0\n"
    path = _write_bbox(tmp_path, "Pos1.csv", original)

    assert migrate_workspace(tmp_path) == []
    assert migrate_workspace(tmp_path) == []
    assert path.read_text(encoding="utf-8") == original


def test_migrate_errors_when_crop_and_roi_both_present(tmp_path: Path) -> None:
    _write_bbox(tmp_path, "Pos2.csv", "crop,roi,x,y,w,h\n0,0,1,2,3,4\n")

    with pytest.raises(ValueError, match="both `crop` and `roi`"):
        migrate_workspace(tmp_path)


def test_migrate_errors_when_neither_crop_nor_roi_present(tmp_path: Path) -> None:
    _write_bbox(tmp_path, "Pos3.csv", "x,y,w,h\n1,2,3,4\n")

    with pytest.raises(
        ValueError, match=r"missing required columns \(roi, x, y, w, h\)"
    ):
        migrate_workspace(tmp_path)


def test_parser_without_migrate_fails_on_crop_header(tmp_path: Path) -> None:
    path = tmp_path / "Pos0.csv"
    path.write_text("crop,x,y,w,h\n0,1,2,3,4\n", encoding="utf-8")

    with pytest.raises(ValueError, match="unsupported column `crop`"):
        parse_bbox_csv(path)


def test_parser_requires_roi_columns(tmp_path: Path) -> None:
    path = tmp_path / "Pos0.csv"
    path.write_text("roi,x,y,w,h\n0,1,2,3,4\n", encoding="utf-8")
    bboxes = parse_bbox_csv(path)
    assert bboxes[0].roi == 0
    assert bboxes[0].w == 3


def test_crop_position_migrates_before_parse(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    workspace = tmp_path / "ws"
    path = _write_bbox(workspace, "Pos0.csv", "crop,x,y,w,h\n0,0,0,1,1\n")
    source = tmp_path / "source.nd2"
    source.write_bytes(b"")

    def fail_open(_source: Path) -> None:
        raise RuntimeError("stop after migrate")

    monkeypatch.setattr(crop, "open_reader", fail_open)
    with pytest.raises(RuntimeError, match="stop after migrate"):
        crop.crop_position(workspace, source, 0)

    assert path.read_text(encoding="utf-8").startswith("roi,x,y,w,h")


def test_load_bbox_rows_migrates_crop_header(tmp_path: Path) -> None:
    workspace = tmp_path / "ws"
    path = _write_bbox(workspace, "Pos0.csv", "crop,x,y,w,h,i,j\n3,1,2,3,4,0,1\n")

    rows = load_bbox_rows(workspace, 0)

    assert path.read_text(encoding="utf-8").startswith("roi,x,y,w,h,i,j")
    assert rows[0].roi == 3
    assert rows[0].x == 1
    assert rows[0].y == 2
    assert rows[0].w == 3
    assert rows[0].h == 4
