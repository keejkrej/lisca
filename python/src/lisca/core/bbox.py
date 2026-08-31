from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RoiBbox:
    roi: int
    x: int
    y: int
    w: int
    h: int


def workspace_bbox_csv_path(workspace: Path, pos: int) -> Path:
    return (workspace.resolve() / "bbox" / f"Pos{pos}.csv").resolve()


def workspace_roi_pos_dir(workspace: Path, pos: int) -> Path:
    return (workspace.resolve() / "roi" / f"Pos{pos}").resolve()


def discover_bbox_positions(workspace: Path) -> list[int]:
    bbox_dir = workspace.resolve() / "bbox"
    if not bbox_dir.is_dir():
        return []
    positions: list[int] = []
    for path in sorted(bbox_dir.glob("Pos*.csv")):
        stem = path.stem
        if not stem.startswith("Pos"):
            continue
        try:
            positions.append(int(stem[3:]))
        except ValueError:
            continue
    return positions


def parse_bbox_csv(path: Path) -> list[RoiBbox]:
    text = path.read_text(encoding="utf-8")
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        raise ValueError(f"BBox CSV is empty: {path}")

    reader = csv.reader(lines)
    header = [cell.strip().lower() for cell in next(reader)]
    try:
        if "roi" in header:
            roi_idx = header.index("roi")
        else:
            roi_idx = header.index("crop")
        x_idx = header.index("x")
        y_idx = header.index("y")
        w_idx = header.index("w")
        h_idx = header.index("h")
    except ValueError as exc:
        raise ValueError(
            f"BBox CSV is missing required columns (roi, x, y, w, h): {path}"
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
