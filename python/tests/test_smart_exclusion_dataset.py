from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import tifffile

from lisca.services.smart_exclusion_dataset import (
    CreateSmartExclusionDatasetOptions,
    create_smart_exclusion_dataset,
)


def _write_align_state(
    workspace: Path,
    position: int,
    *,
    excluded: list[tuple[int, int]],
) -> None:
    align_dir = workspace / "align"
    align_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "excludedCells": [{"i": i, "j": j} for i, j in excluded],
        "grid": {
            "enabled": True,
            "shape": "rect",
            "tx": -10,
            "ty": -10,
            "rotation": 0,
            "spacingA": 50,
            "spacingB": 50,
            "cellWidth": 50,
            "cellHeight": 50,
            "opacity": 0.35,
        },
    }
    (align_dir / f"Pos{position}.json").write_text(json.dumps(payload), encoding="utf-8")


def _write_bbox(workspace: Path, position: int) -> None:
    bbox_dir = workspace / "bbox"
    bbox_dir.mkdir(parents=True, exist_ok=True)
    (bbox_dir / f"Pos{position}.csv").write_text(
        "roi,x,y,w,h,i,j\n0,10,10,50,50,0,0\n",
        encoding="utf-8",
    )


def _write_roi_stack(workspace: Path, position: int) -> None:
    roi_dir = workspace / "roi" / f"Pos{position}"
    roi_dir.mkdir(parents=True, exist_ok=True)
    frame = np.full((50, 50), 128, dtype=np.uint16)
    tifffile.imwrite(roi_dir / "Roi0.tif", frame)
    index = {
        "axisOrder": "TCZYX",
        "channelCount": 1,
        "position": position,
        "rois": [
            {
                "bbox": {"h": 50, "roi": 0, "w": 50, "x": 10, "y": 10},
                "fileName": "Roi0.tif",
                "roi": 0,
                "shape": [1, 1, 1, 50, 50],
            }
        ],
    }
    (roi_dir / "index.json").write_text(json.dumps(index), encoding="utf-8")


def _write_source_frame(source: Path, position: int) -> None:
    pos_dir = source / f"Pos{position}"
    pos_dir.mkdir(parents=True, exist_ok=True)
    frame = np.linspace(0, 65535, 100 * 100, dtype=np.uint16).reshape(100, 100)
    tifffile.imwrite(
        pos_dir / f"img_channel000_position{position}_time000000000_z000.tif",
        frame,
    )


def test_create_smart_exclusion_dataset_filters_small_excluded_cells(
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    source = tmp_path / "source"
    output = tmp_path / "dataset"
    position = 1

    _write_align_state(workspace, position, excluded=[(-1, 0), (0, 0)])
    _write_bbox(workspace, position)
    _write_roi_stack(workspace, position)
    _write_source_frame(source, position)

    manifest = create_smart_exclusion_dataset(
        CreateSmartExclusionDatasetOptions(
            workspace=workspace,
            source=source,
            output=output,
            positions=[position],
            val_positions=[position],
            min_area_ratio=0.8,
        )
    )

    assert manifest["counts"]["include"] == 1
    assert manifest["counts"]["exclude"] == 1
    assert manifest["ratio_filter"]["Pos1"]["ratio_filtered"] == 1
    assert manifest["ratio_filter"]["Pos1"]["user_pref_excluded"] == 1

    exclude_files = list((output / "exclude").glob("*.png"))
    assert len(exclude_files) == 1
    assert "i0_j0" in exclude_files[0].name

    metadata = (output / "metadata.csv").read_text(encoding="utf-8")
    assert "exclude/" in metadata
    assert "i-1_j0" not in metadata

    exclude_rows = [line for line in metadata.splitlines() if line.startswith("exclude/")]
    assert len(exclude_rows) == 1
    assert ",0," in exclude_rows[0]
