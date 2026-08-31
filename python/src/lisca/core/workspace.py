from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from lisca.core.align_grid import AlignGridState, CellCoord, align_grid_state_from_json
from lisca.core.bbox import RoiBbox, parse_bbox_csv
from lisca.core.paths import (
    ALIGN_DIR,
    ANALYSIS_DIR,
    ASSAY_JSON,
    BBOX_COLUMNS,
    BBOX_DIR,
    INDEX_JSON,
    MASK_DIR,
    POS_PREFIX,
    RESULTS_DIR,
    ROI_DIR,
    align_dir,
    align_json_path,
    analysis_dir,
    assay_json_path,
    bbox_csv_path,
    bbox_dir,
    mask_dir,
    mask_pos_dir,
    pos_name,
    results_dir,
    roi_dir,
    roi_index_path,
    roi_pos_dir,
    roi_tiff_path,
)
from lisca.migrations import migrate_workspace

# Folder names other packages should import instead of hard-coding.
__all__ = [
    "ALIGN_DIR",
    "ANALYSIS_DIR",
    "ASSAY_JSON",
    "BBOX_COLUMNS",
    "BBOX_DIR",
    "INDEX_JSON",
    "MASK_DIR",
    "POS_PREFIX",
    "RESULTS_DIR",
    "ROI_DIR",
    "PositionIndex",
    "RoiEntry",
    "SavedAlignState",
    "align_dir",
    "align_json_path",
    "analysis_dir",
    "assay_json_path",
    "bbox_csv_path",
    "bbox_dir",
    "list_align_positions",
    "load_bbox_rows",
    "load_position_index",
    "load_saved_align_state",
    "mask_dir",
    "mask_pos_dir",
    "pos_name",
    "results_dir",
    "roi_dir",
    "roi_index_path",
    "roi_pos_dir",
    "roi_tiff_path",
]


@dataclass(frozen=True)
class SavedAlignState:
    grid: AlignGridState
    excluded_cells: list[CellCoord]


@dataclass(frozen=True)
class RoiEntry:
    roi: int
    file_name: str
    shape: tuple[int, int, int, int, int]
    bbox: RoiBbox


@dataclass(frozen=True)
class PositionIndex:
    position: int
    axis_order: str
    time_count: int
    channel_count: int
    z_count: int
    rois: list[RoiEntry]
    time_indices: list[int]


def list_align_positions(workspace: Path) -> list[int]:
    directory = align_dir(workspace)
    if not directory.is_dir():
        return []
    positions: list[int] = []
    for path in sorted(directory.glob(f"{POS_PREFIX}*.json")):
        suffix = path.stem.removeprefix(POS_PREFIX)
        if suffix.isdigit():
            positions.append(int(suffix))
    return positions


def load_saved_align_state(workspace: Path, position: int) -> SavedAlignState:
    path = align_json_path(workspace, position)
    raw = json.loads(path.read_text(encoding="utf-8"))
    excluded = [
        CellCoord(i=int(cell["i"]), j=int(cell["j"]))
        for cell in raw.get("excludedCells", [])
    ]
    return SavedAlignState(
        grid=align_grid_state_from_json(raw["grid"]),
        excluded_cells=excluded,
    )


def load_bbox_rows(workspace: Path, position: int) -> list[RoiBbox]:
    migrate_workspace(workspace)
    return parse_bbox_csv(bbox_csv_path(workspace, position))


def _shape_from_bbox(
    time_count: int, channel_count: int, z_count: int, bbox: RoiBbox
) -> tuple[int, int, int, int, int]:
    return (time_count, channel_count, z_count, bbox.h, bbox.w)


def load_position_index(workspace: Path, position: int) -> PositionIndex:
    """Read ``roi/Pos{n}/index.json``. Stack shape is derived from counts + bbox."""
    path = roi_index_path(workspace, position)
    raw = json.loads(path.read_text(encoding="utf-8"))
    axis_order = str(raw.get("axisOrder", "TCZYX")).upper()
    time_count = int(raw.get("timeCount", 1))
    channel_count = int(raw.get("channelCount", 1))
    z_count = int(raw.get("zCount", 1))
    rois: list[RoiEntry] = []
    for entry in raw.get("rois", []):
        bbox_raw = entry.get("bbox")
        if not isinstance(bbox_raw, dict):
            raise ValueError(f"{path} ROI entry is missing bbox")
        bbox = RoiBbox(
            roi=int(entry["roi"]),
            x=int(bbox_raw["x"]),
            y=int(bbox_raw["y"]),
            w=int(bbox_raw["w"]),
            h=int(bbox_raw["h"]),
        )
        rois.append(
            RoiEntry(
                roi=bbox.roi,
                file_name=str(entry["fileName"]),
                shape=_shape_from_bbox(time_count, channel_count, z_count, bbox),
                bbox=bbox,
            )
        )
    raw_indices = raw.get("timeIndices")
    if raw_indices is None:
        time_indices = list(range(time_count))
    else:
        time_indices = [int(value) for value in raw_indices]
        if len(time_indices) != time_count:
            raise ValueError(
                f"{path}: timeIndices length {len(time_indices)} "
                f"does not match timeCount {time_count}"
            )
    return PositionIndex(
        position=int(raw["position"]),
        axis_order=axis_order,
        time_count=time_count,
        channel_count=channel_count,
        z_count=z_count,
        rois=rois,
        time_indices=time_indices,
    )
