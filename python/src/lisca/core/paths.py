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
ANNOTATIONS_DIR = "annotations"
ANNOTATION_LABELS_JSON = "labels.json"
TIMESERIES_DIR = "timeseries"
SIDECAR_DIR = "sidecar"
ASSAY_JSON = "assay.json"
INDEX_JSON = "index.json"
POS_PREFIX = "Pos"

BBOX_COLUMNS: tuple[str, ...] = ("roi", "x", "y", "w", "h")

# Reserved filenames under `sidecar/` for a future killing sidecar / workstation.
# lisca does not write these; they are stable import paths for downstream tools.
SIDECAR_EVENTS_JSON = "events.json"
SIDECAR_TRACES_PARQUET = "traces.parquet"
SIDECAR_TRACKS_CSV = "tracks.csv"
SIDECAR_ENGAGEMENTS_CSV = "engagements.csv"
OCCUPANCY_PACK_JSON = "occupancy-pack.json"


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


def occupancy_pack_path(workspace: Path) -> Path:
    """Workspace-level few-shot occupancy pack (not per Pos)."""
    return align_dir(workspace) / OCCUPANCY_PACK_JSON


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


def annotations_dir(workspace: Path) -> Path:
    return Path(workspace) / ANNOTATIONS_DIR


def annotation_labels_path(workspace: Path) -> Path:
    return annotations_dir(workspace) / ANNOTATION_LABELS_JSON


def timeseries_dir(workspace: Path) -> Path:
    return Path(workspace) / TIMESERIES_DIR


def timeseries_pos_dir(workspace: Path, pos: int) -> Path:
    return timeseries_dir(workspace) / pos_name(pos)


def sidecar_dir(workspace: Path) -> Path:
    return Path(workspace) / SIDECAR_DIR


def sidecar_path(workspace: Path, file_name: str) -> Path:
    return sidecar_dir(workspace) / file_name
