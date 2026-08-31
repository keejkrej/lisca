from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from lisca.core.paths import (
    BBOX_COLUMNS,
    BBOX_DIR,
    POS_PREFIX,
    bbox_csv_name,
    bbox_csv_path,
    bbox_dir,
    roi_pos_dir,
)


@dataclass(frozen=True)
class RoiBbox:
    roi: int
    x: int
    y: int
    w: int
    h: int


def workspace_bbox_csv_path(workspace: Path, pos: int) -> Path:
    return bbox_csv_path(workspace, pos).resolve()


def workspace_roi_pos_dir(workspace: Path, pos: int) -> Path:
    return roi_pos_dir(workspace, pos).resolve()


def discover_bbox_positions(workspace: Path) -> list[int]:
    directory = bbox_dir(workspace).resolve()
    if not directory.is_dir():
        return []
    positions: list[int] = []
    for path in sorted(directory.glob(f"{POS_PREFIX}*.csv")):
        stem = path.stem
        if not stem.startswith(POS_PREFIX):
            continue
        suffix = stem[len(POS_PREFIX) :]
        if not suffix.isdigit():
            continue
        if path.name != bbox_csv_name(int(suffix)):
            continue
        positions.append(int(suffix))
    return positions


def parse_bbox_csv(path: Path) -> list[RoiBbox]:
    """Read a live bbox CSV. Header must include ``roi, x, y, w, h`` by name.

    Extra columns are ignored. ``crop`` is not an alias for ``roi``; migrate
    that header before calling this parser.
    """
    text = path.read_text(encoding="utf-8")
    if text.startswith("\ufeff"):
        text = text[1:]
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        raise ValueError(f"BBox CSV is empty: {path}")

    reader = csv.reader(lines)
    header = [cell.strip().lower() for cell in next(reader)]
    if "crop" in header:
        raise ValueError(
            f"BBox CSV uses unsupported column `crop` (not a live header); "
            f"required columns (roi, x, y, w, h): {path}"
        )
    try:
        roi_idx = header.index("roi")
        x_idx = header.index("x")
        y_idx = header.index("y")
        w_idx = header.index("w")
        h_idx = header.index("h")
    except ValueError as exc:
        raise ValueError(
            f"BBox CSV is missing required columns ({', '.join(BBOX_COLUMNS)}): {path}"
        ) from exc

    required_idx = max(roi_idx, x_idx, y_idx, w_idx, h_idx)
    bboxes: list[RoiBbox] = []
    seen: set[int] = set()
    for row_number, parts in enumerate(reader, start=2):
        if len(parts) <= required_idx:
            raise ValueError(f"BBox CSV row {row_number} is malformed in {path}")
        bbox = RoiBbox(
            roi=int(parts[roi_idx].strip()),
            x=int(parts[x_idx].strip()),
            y=int(parts[y_idx].strip()),
            w=int(parts[w_idx].strip()),
            h=int(parts[h_idx].strip()),
        )
        if bbox.w <= 0 or bbox.h <= 0:
            raise ValueError(
                f"BBox row {row_number} must have positive width and height in {path}"
            )
        if bbox.roi in seen:
            raise ValueError(f"Duplicate roi {bbox.roi} in {path}")
        seen.add(bbox.roi)
        bboxes.append(bbox)

    if not bboxes:
        raise ValueError(f"BBox CSV does not contain any ROI rows: {path}")
    return sorted(bboxes, key=lambda item: item.roi)


def validate_bboxes(bboxes: list[RoiBbox], width: int, height: int) -> None:
    for bbox in bboxes:
        if bbox.x + bbox.w > width or bbox.y + bbox.h > height:
            raise ValueError(
                f"ROI {bbox.roi} bbox ({bbox.x}, {bbox.y}, {bbox.w}, {bbox.h}) "
                f"exceeds frame bounds {width}x{height}"
            )


# Re-export so callers that already import bbox helpers can see the folder name.
__all__ = [
    "BBOX_COLUMNS",
    "BBOX_DIR",
    "RoiBbox",
    "discover_bbox_positions",
    "parse_bbox_csv",
    "validate_bboxes",
    "workspace_bbox_csv_path",
    "workspace_roi_pos_dir",
]
