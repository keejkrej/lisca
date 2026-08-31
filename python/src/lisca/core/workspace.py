from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path

from lisca.core.align_grid import AlignGridState, CellCoord, align_grid_state_from_json
from lisca.migrations import migrate_workspace


@dataclass(frozen=True)
class SavedAlignState:
    grid: AlignGridState
    excluded_cells: list[CellCoord]


@dataclass(frozen=True)
class BboxRow:
    roi: int
    x: int
    y: int
    w: int
    h: int
    i: int | None = None
    j: int | None = None


@dataclass(frozen=True)
class RoiEntry:
    roi: int
    file_name: str
    shape: tuple[int, int, int, int, int]


@dataclass(frozen=True)
class PositionIndex:
    position: int
    axis_order: str
    time_count: int
    channel_count: int
    z_count: int
    rois: list[RoiEntry]


def list_align_positions(workspace: Path) -> list[int]:
    align_dir = workspace / "align"
    if not align_dir.is_dir():
        return []
    positions: list[int] = []
    for path in sorted(align_dir.glob("Pos*.json")):
        suffix = path.stem.removeprefix("Pos")
        if suffix.isdigit():
            positions.append(int(suffix))
    return positions


def load_saved_align_state(workspace: Path, position: int) -> SavedAlignState:
    path = workspace / "align" / f"Pos{position}.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    excluded = [
        CellCoord(i=int(cell["i"]), j=int(cell["j"]))
        for cell in raw.get("excludedCells", [])
    ]
    return SavedAlignState(
        grid=align_grid_state_from_json(raw["grid"]),
        excluded_cells=excluded,
    )


def load_bbox_rows(workspace: Path, position: int) -> list[BboxRow]:
    migrate_workspace(workspace)
    path = workspace / "bbox" / f"Pos{position}.csv"
    rows: list[BboxRow] = []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        for line_index, columns in enumerate(reader):
            trimmed = [column.strip() for column in columns]
            if not trimmed or all(not column for column in trimmed):
                continue
            if line_index == 0:
                name = trimmed[0].lower()
                if name == "crop":
                    msg = (
                        f"BBox CSV uses unsupported column `crop` "
                        f"(not a live header): {path}"
                    )
                    raise ValueError(msg)
                if name == "roi":
                    continue
            if len(trimmed) < 5:
                msg = f"{path}:{line_index + 1} expected at least 5 columns"
                raise ValueError(msg)
            roi = int(trimmed[0])
            x = int(trimmed[1])
            y = int(trimmed[2])
            w = int(trimmed[3])
            h = int(trimmed[4])
            if w == 0 or h == 0:
                continue
            i_value = int(trimmed[5]) if len(trimmed) > 5 else None
            j_value = int(trimmed[6]) if len(trimmed) > 6 else None
            rows.append(BboxRow(roi=roi, x=x, y=y, w=w, h=h, i=i_value, j=j_value))
    return rows


def _axis_count(
    axis_order: str, shape: tuple[int, int, int, int, int], axis: str
) -> int:
    try:
        index = axis_order.index(axis)
    except ValueError:
        return 1
    return shape[index]


def load_position_index(workspace: Path, position: int) -> PositionIndex:
    path = workspace / "roi" / f"Pos{position}" / "index.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    rois = [
        RoiEntry(
            roi=int(entry["roi"]),
            file_name=str(entry["fileName"]),
            shape=tuple(int(value) for value in entry["shape"]),
        )
        for entry in raw.get("rois", [])
    ]
    axis_order = str(raw.get("axisOrder", "TCZYX")).upper()
    reference_shape = rois[0].shape if rois else (1, 1, 1, 1, 1)
    return PositionIndex(
        position=int(raw["position"]),
        axis_order=axis_order,
        time_count=_axis_count(axis_order, reference_shape, "T"),
        channel_count=_axis_count(axis_order, reference_shape, "C"),
        z_count=_axis_count(axis_order, reference_shape, "Z"),
        rois=rois,
    )


def roi_tiff_path(workspace: Path, position: int, file_name: str) -> Path:
    return workspace / "roi" / f"Pos{position}" / file_name
