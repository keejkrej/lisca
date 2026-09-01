"""Canonical workspace folder names and path builders.

Assay sidecars should import these instead of hard-coding directory names.
Live bbox CSV schema is ``roi, x, y, w, h``; see ``lisca.core.bbox.parse_bbox_csv``.
"""

from __future__ import annotations

from pathlib import Path

BBOX_DIR = "bbox"
ROI_DIR = "roi"
ALIGN_DIR = "align"
MASK_DIR = "mask"
ANALYSIS_DIR = "analysis"
RESULTS_DIR = "results"
ASSAY_JSON = "assay.json"
INDEX_JSON = "index.json"
POS_PREFIX = "Pos"

BBOX_COLUMNS: tuple[str, ...] = ("roi", "x", "y", "w", "h")


def pos_name(pos: int) -> str:
    return f"{POS_PREFIX}{pos}"


def bbox_csv_name(pos: int) -> str:
    return f"{pos_name(pos)}.csv"


def roi_tiff_name(roi: int) -> str:
    return f"Roi{roi}.tif"


def align_json_name(pos: int) -> str:
    return f"{pos_name(pos)}.json"


def bbox_dir(workspace: Path) -> Path:
    return Path(workspace) / BBOX_DIR


def bbox_csv_path(workspace: Path, pos: int) -> Path:
    return bbox_dir(workspace) / bbox_csv_name(pos)


def roi_dir(workspace: Path) -> Path:
    return Path(workspace) / ROI_DIR


def roi_pos_dir(workspace: Path, pos: int) -> Path:
    return roi_dir(workspace) / pos_name(pos)


def roi_index_path(workspace: Path, pos: int) -> Path:
    return roi_pos_dir(workspace, pos) / INDEX_JSON


def roi_tiff_path(workspace: Path, pos: int, file_name: str) -> Path:
    return roi_pos_dir(workspace, pos) / file_name


def align_dir(workspace: Path) -> Path:
    return Path(workspace) / ALIGN_DIR


def align_json_path(workspace: Path, pos: int) -> Path:
    return align_dir(workspace) / align_json_name(pos)


def mask_dir(workspace: Path) -> Path:
    return Path(workspace) / MASK_DIR


def mask_pos_dir(workspace: Path, pos: int) -> Path:
    return mask_dir(workspace) / pos_name(pos)


def analysis_dir(workspace: Path) -> Path:
    return Path(workspace) / ANALYSIS_DIR


def results_dir(workspace: Path) -> Path:
    return Path(workspace) / RESULTS_DIR


def assay_json_path(workspace: Path) -> Path:
    return Path(workspace) / ASSAY_JSON
