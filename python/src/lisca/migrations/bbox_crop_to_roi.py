"""Rewrite bbox CSV header ``crop`` → ``roi`` in place."""

from __future__ import annotations

import csv
import io
import os
import tempfile
from pathlib import Path

from lisca.core.bbox import discover_bbox_positions, workspace_bbox_csv_path

_CROP = "crop"
_ROI = "roi"


def migrate_bbox_crop_to_roi(workspace: Path) -> list[str]:
    """Rewrite ``crop`` headers on ``bbox/Pos*.csv``. Returns rewritten paths."""
    rewritten: list[str] = []
    for pos in discover_bbox_positions(workspace):
        path = workspace_bbox_csv_path(workspace, pos)
        if _migrate_bbox_file(path):
            rewritten.append(str(path))
    return rewritten


def _migrate_bbox_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if text.startswith("\ufeff"):
        text = text[1:]
    header_line, newline, rest = _split_first_line(text)
    cells = _header_cells(header_line)
    names = [cell.strip().lower() for cell in cells]
    has_crop = _CROP in names
    has_roi = _ROI in names
    if has_crop and has_roi:
        raise ValueError(f"BBox CSV has both `crop` and `roi` columns: {path}")
    if not has_crop and not has_roi:
        raise ValueError(
            f"BBox CSV is missing required columns (roi, x, y, w, h): {path}"
        )
    if has_roi:
        return False

    new_header = _rewritten_header_line(cells)
    _atomic_write_text(path, f"{new_header}{newline}{rest}")
    return True


def _header_cells(header_line: str) -> list[str]:
    row = next(csv.reader([header_line]), [])
    return list(row)


def _rewritten_header_line(cells: list[str]) -> str:
    new_cells = [_ROI if cell.strip().lower() == _CROP else cell for cell in cells]
    buf = io.StringIO()
    csv.writer(buf, lineterminator="").writerow(new_cells)
    return buf.getvalue()


def _split_first_line(text: str) -> tuple[str, str, str]:
    for newline in ("\r\n", "\n", "\r"):
        if newline in text:
            header, rest = text.split(newline, 1)
            return header, newline, rest
    return text, "\n", ""


def _atomic_write_text(path: Path, text: str) -> None:
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
        os.replace(tmp_path, path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise
