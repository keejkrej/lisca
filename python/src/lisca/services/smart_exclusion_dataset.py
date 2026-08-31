from __future__ import annotations

import csv
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from lisca.core.align_grid import (
    FrameBounds,
    enumerate_visible_align_grid_cells,
    filter_user_preference_excluded,
)
from lisca.core.frame_normalize import (
    crop_frame_uint8,
    normalize_frame_to_uint8,
    resize_grayscale,
    save_grayscale_png,
)
from lisca.core.roi_stack import load_roi_stack, roi_frame_2d
from lisca.core.source import (
    SourceFrameRequest,
    find_source_frame_path,
    load_source_frame,
)
from lisca.core.workspace import (
    list_align_positions,
    load_bbox_rows,
    load_position_index,
    load_saved_align_state,
    roi_tiff_path,
)


@dataclass(frozen=True)
class DatasetSample:
    path: str
    label: int
    position: int
    i: int | None
    j: int | None
    roi: int | None
    split: str
    source_kind: str
    area_ratio: float | None


@dataclass(frozen=True)
class PositionStats:
    saved_excluded: int
    ratio_filtered: int
    missing_grid: int
    user_pref_excluded: int
    included: int


@dataclass(frozen=True)
class CreateSmartExclusionDatasetOptions:
    workspace: Path
    source: Path
    output: Path
    time: int = 0
    channel: int = 0
    z: int = 0
    image_size: int | None = None
    min_area_ratio: float = 0.8
    positions: list[int] | None = None
    val_positions: list[int] | None = None


def _split_for_position(
    position: int,
    *,
    train_positions: set[int],
    val_positions: set[int],
) -> str:
    if position in val_positions:
        return "val"
    if position in train_positions:
        return "train"
    return "train"


def _prepare_image(image: np.ndarray, image_size: int | None) -> np.ndarray:
    normalized = normalize_frame_to_uint8(image)
    if image_size is None:
        return normalized
    return resize_grayscale(normalized, image_size)


def create_smart_exclusion_dataset(options: CreateSmartExclusionDatasetOptions) -> dict:
    all_positions = sorted(
        set(options.positions or list_align_positions(options.workspace))
    )
    if not all_positions:
        raise ValueError("no align positions found in workspace")

    val_positions = set(options.val_positions or [all_positions[-1]])
    train_positions = {
        position for position in all_positions if position not in val_positions
    }

    output = options.output
    include_dir = output / "include"
    exclude_dir = output / "exclude"
    include_dir.mkdir(parents=True, exist_ok=True)
    exclude_dir.mkdir(parents=True, exist_ok=True)

    samples: list[DatasetSample] = []
    position_stats: dict[str, PositionStats] = {}

    for position in all_positions:
        align_state = load_saved_align_state(options.workspace, position)
        bbox_rows = load_bbox_rows(options.workspace, position)
        position_index = load_position_index(options.workspace, position)
        roi_by_id = {entry.roi: entry for entry in position_index.rois}

        frame_path = find_source_frame_path(
            options.source,
            SourceFrameRequest(
                position=position,
                time=options.time,
                channel=options.channel,
                z=options.z,
            ),
        )
        source_frame = load_source_frame(frame_path)
        frame_height, frame_width = source_frame.shape[:2]
        frame = FrameBounds(width=frame_width, height=frame_height)

        cell_boxes = {
            (cell.i, cell.j): cell
            for cell in enumerate_visible_align_grid_cells(frame, align_state.grid)
        }
        full_width = max(1, round(align_state.grid.cell_width))
        full_height = max(1, round(align_state.grid.cell_height))

        user_pref, ratio_filtered, missing = filter_user_preference_excluded(
            align_state.excluded_cells,
            cell_boxes,
            full_width=full_width,
            full_height=full_height,
            min_area_ratio=options.min_area_ratio,
        )
        split = _split_for_position(
            position,
            train_positions=train_positions,
            val_positions=val_positions,
        )

        for bbox in bbox_rows:
            entry = roi_by_id.get(bbox.roi)
            if entry is None:
                continue
            stack = load_roi_stack(
                roi_tiff_path(options.workspace, position, entry.file_name),
                entry.shape,
            )
            frame_2d = roi_frame_2d(
                stack,
                position_index.axis_order,
                options.time,
                options.channel,
                options.z,
            )
            image = _prepare_image(frame_2d, options.image_size)
            file_name = f"Pos{position}_Roi{bbox.roi}_include.png"
            relative_path = f"include/{file_name}"
            save_grayscale_png(str(include_dir / file_name), image)
            samples.append(
                DatasetSample(
                    path=relative_path,
                    label=1,
                    position=position,
                    i=None,
                    j=None,
                    roi=bbox.roi,
                    split=split,
                    source_kind="roi_stack",
                    area_ratio=1.0,
                )
            )

        for coord, box, ratio in user_pref:
            crop = crop_frame_uint8(source_frame, box.x, box.y, box.w, box.h)
            image = _prepare_image(crop, options.image_size)
            file_name = f"Pos{position}_i{coord.i}_j{coord.j}_exclude.png"
            relative_path = f"exclude/{file_name}"
            save_grayscale_png(str(exclude_dir / file_name), image)
            samples.append(
                DatasetSample(
                    path=relative_path,
                    label=0,
                    position=position,
                    i=coord.i,
                    j=coord.j,
                    roi=None,
                    split=split,
                    source_kind="source_crop",
                    area_ratio=ratio,
                )
            )

        position_stats[f"Pos{position}"] = PositionStats(
            saved_excluded=len(align_state.excluded_cells),
            ratio_filtered=ratio_filtered,
            missing_grid=missing,
            user_pref_excluded=len(user_pref),
            included=len(bbox_rows),
        )

    exclude_samples = [sample for sample in samples if sample.label == 0]
    if exclude_samples and any(
        (sample.area_ratio or 0.0) < options.min_area_ratio
        for sample in exclude_samples
    ):
        raise AssertionError("exclude samples must satisfy min_area_ratio")

    metadata_path = output / "metadata.csv"
    with metadata_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "path",
                "label",
                "position",
                "i",
                "j",
                "roi",
                "split",
                "source_kind",
                "area_ratio",
            ],
        )
        writer.writeheader()
        for sample in samples:
            writer.writerow(asdict(sample))

    manifest = {
        "version": 1,
        "created_at": datetime.now(UTC).isoformat(),
        "workspace": str(options.workspace),
        "source": str(options.source),
        "time": options.time,
        "channel": options.channel,
        "z": options.z,
        "image_size": options.image_size,
        "min_area_ratio": options.min_area_ratio,
        "train_positions": sorted(train_positions),
        "val_positions": sorted(val_positions),
        "counts": {
            "include": sum(1 for sample in samples if sample.label == 1),
            "exclude": sum(1 for sample in samples if sample.label == 0),
            "total": len(samples),
        },
        "ratio_filter": {
            position: asdict(stats) for position, stats in position_stats.items()
        },
    }
    manifest_path = output / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest
