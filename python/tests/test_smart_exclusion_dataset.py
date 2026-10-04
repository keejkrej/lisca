from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
import tifffile
from PIL import Image

from lisca.services.smart_exclusion_dataset import (
    CreateSmartExclusionDatasetOptions,
    create_smart_exclusion_dataset,
)


def _write_align_state(
    workspace: Path,
    position: int,
    *,
    excluded: list[tuple[int, int]],
    drift: dict[str, object] | None = None,
) -> None:
    align_dir = workspace / "align"
    align_dir.mkdir(parents=True, exist_ok=True)
    payload: dict[str, object] = {
        "excludedPatterns": [{"i": i, "j": j} for i, j in excluded],
        "grid": {
            "enabled": True,
            "shape": "rect",
            "tx": -10,
            "ty": -10,
            "rotation": 0,
            "spacingA": 50,
            "spacingB": 50,
            "patternWidth": 50,
            "patternHeight": 50,
            "opacity": 0.35,
        },
    }
    if drift is not None:
        payload["drift"] = drift
    (align_dir / f"Pos{position}.json").write_text(
        json.dumps(payload), encoding="utf-8"
    )


def _write_bbox(
    workspace: Path, position: int, *, width: int = 50, height: int = 50
) -> None:
    bbox_dir = workspace / "bbox"
    bbox_dir.mkdir(parents=True, exist_ok=True)
    (bbox_dir / f"Pos{position}.csv").write_text(
        f"roi,x,y,w,h\n0,10,10,{width},{height}\n",
        encoding="utf-8",
    )


def _write_roi_stack(
    workspace: Path,
    position: int,
    *,
    pages: list[np.ndarray] | None = None,
    time_indices: list[int] | None = None,
    bbox: tuple[int, int, int, int] = (10, 10, 50, 50),
) -> None:
    roi_dir = workspace / "roi" / f"Pos{position}"
    roi_dir.mkdir(parents=True, exist_ok=True)
    x, y, width, height = bbox
    frames = (
        pages if pages is not None else [np.full((height, width), 128, dtype=np.uint16)]
    )
    with tifffile.TiffWriter(roi_dir / "Roi0.tif") as writer:
        for frame in frames:
            writer.write(frame)
    index: dict[str, object] = {
        "axisOrder": "TCZYX",
        "channelCount": 1,
        "position": position,
        "timeCount": len(frames),
        "zCount": 1,
        "rois": [
            {
                "bbox": {"h": height, "roi": 0, "w": width, "x": x, "y": y},
                "fileName": "Roi0.tif",
                "roi": 0,
            }
        ],
    }
    if time_indices is not None:
        index["timeIndices"] = time_indices
    (roi_dir / "index.json").write_text(json.dumps(index), encoding="utf-8")


def _write_source_frame(
    source: Path, position: int, ext: str = "tif", time: int = 0
) -> None:
    pos_dir = source / f"Pos{position}"
    pos_dir.mkdir(parents=True, exist_ok=True)
    frame = np.linspace(0, 65535, 100 * 100, dtype=np.uint16).reshape(100, 100)
    name = f"img_channel000_position{position}_time{time:09d}_z000.{ext}"
    if ext in ("tif", "tiff"):
        tifffile.imwrite(pos_dir / name, frame)
    else:
        Image.fromarray(frame).save(pos_dir / name)


@pytest.mark.parametrize("ext", ["tif", "png"])
def test_create_smart_exclusion_dataset_filters_small_excluded_patterns(
    tmp_path: Path,
    ext: str,
) -> None:
    workspace = tmp_path / "workspace"
    source = tmp_path / "source"
    output = tmp_path / "dataset"
    position = 1

    _write_align_state(workspace, position, excluded=[(-1, 0), (0, 0)])
    _write_bbox(workspace, position)
    _write_roi_stack(workspace, position)
    _write_source_frame(source, position, ext)

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

    exclude_rows = [
        line for line in metadata.splitlines() if line.startswith("exclude/")
    ]
    assert len(exclude_rows) == 1
    assert ",0," in exclude_rows[0]


def test_smart_exclusion_reads_time_index_page_not_the_label(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import lisca.services.smart_exclusion_dataset as dataset
    from lisca.core.align_grid import AlignGridState, FrameBounds, PatternBox
    from lisca.core.roi_stack import RoiStack

    workspace = tmp_path / "workspace"
    source = tmp_path / "source"
    output = tmp_path / "dataset"
    position = 1
    _write_align_state(
        workspace,
        position,
        excluded=[],
        drift={
            "referenceTime": 0,
            "interpolation": "linear",
            "keyframes": [{"time": 5, "dx": 4.0, "dy": -2.0}],
        },
    )
    _write_bbox(workspace, position, width=4, height=4)
    pages = [np.full((4, 4), value, dtype=np.uint16) for value in (1, 2, 3)]
    _write_roi_stack(
        workspace,
        position,
        pages=pages,
        time_indices=[0, 5, 10],
        bbox=(0, 0, 4, 4),
    )
    _write_source_frame(source, position, time=5)

    seen_pages: list[int] = []
    seen_grids: list[tuple[float, float]] = []
    real_roi = dataset.roi_frame_2d
    real_enum = dataset.enumerate_visible_align_grid_patterns

    def spy_roi(
        stack: RoiStack,
        axis_order: str,
        frame: int,
        channel: int,
        z_index: int,
    ) -> np.ndarray:
        seen_pages.append(frame)
        return real_roi(stack, axis_order, frame, channel, z_index)

    def spy_enum(frame: FrameBounds, grid: AlignGridState) -> list[PatternBox]:
        seen_grids.append((grid.tx, grid.ty))
        return real_enum(frame, grid)

    monkeypatch.setattr(dataset, "roi_frame_2d", spy_roi)
    monkeypatch.setattr(dataset, "enumerate_visible_align_grid_patterns", spy_enum)

    manifest = create_smart_exclusion_dataset(
        CreateSmartExclusionDatasetOptions(
            workspace=workspace,
            source=source,
            output=output,
            time=5,
            positions=[position],
            val_positions=[position],
        )
    )

    assert manifest["counts"]["include"] == 1
    assert seen_pages == [1]
    assert seen_grids == [(-6.0, -12.0)]


def test_smart_exclusion_rejects_label_missing_from_time_indices(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import lisca.services.smart_exclusion_dataset as dataset

    workspace = tmp_path / "workspace"
    position = 1
    _write_align_state(workspace, position, excluded=[])
    _write_bbox(workspace, position, width=4, height=4)
    pages = [np.full((4, 4), value, dtype=np.uint16) for value in (1, 2, 3)]
    _write_roi_stack(
        workspace,
        position,
        pages=pages,
        time_indices=[0, 5, 10],
        bbox=(0, 0, 4, 4),
    )

    def fail_read(*_args: object, **_kwargs: object) -> None:
        raise AssertionError("frame read")

    monkeypatch.setattr(dataset, "find_source_frame_path", fail_read)
    monkeypatch.setattr(dataset, "load_source_frame", fail_read)
    monkeypatch.setattr(dataset, "load_roi_stack", fail_read)
    monkeypatch.setattr(dataset, "roi_frame_2d", fail_read)
    monkeypatch.setattr(dataset, "enumerate_visible_align_grid_patterns", fail_read)

    with pytest.raises(ValueError, match="timeIndices"):
        create_smart_exclusion_dataset(
            CreateSmartExclusionDatasetOptions(
                workspace=workspace,
                source=tmp_path / "source",
                output=tmp_path / "dataset",
                time=7,
                positions=[position],
                val_positions=[position],
            )
        )
