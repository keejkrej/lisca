from __future__ import annotations

import csv
import json
import math
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import tifffile

from lisca.data.manifest import UNIFIED_LABEL_FIELDS


DEFAULT_OUTPUT_DIRNAME = "bf_frame_dataset"
EXPECTED_AXIS_ORDER = "TCZYX"
EXPECTED_TIME_COUNT = 241
EXPECTED_CHANNEL_COUNT = 2
EXPECTED_Z_COUNT = 1
LIVE_LABEL_ID = "l"
DEAD_LABEL_ID = "d"
POSITION_NAME = "Pos0"


@dataclass(frozen=True)
class AnnotationAnchor:
    time_index: int
    label_id: str
    annotation_channel: int
    annotation_path: Path


@dataclass(frozen=True)
class RoiLabelSpec:
    roi_name: str
    roi_index: int
    roi_tif_path: Path
    expected_shape: tuple[int, int, int, int, int]
    live_anchor_t: int
    dead_anchor_t: int | None
    annotation_mode: str


@dataclass(frozen=True)
class ConversionSummary:
    roi_count: int
    image_count: int
    live_count: int
    dead_count: int
    mixed_count: int
    warning_count: int
    labels_csv_path: Path


def labels_json_path(input_root: Path) -> Path:
    return input_root / "annotations" / "labels.json"


def annotation_root(input_root: Path, position: str) -> Path:
    return input_root / "annotations" / "roi" / position


def roi_root(input_root: Path, position: str) -> Path:
    return input_root / "roi" / position


def load_labels(labels_path: Path) -> dict[str, str]:
    data = json.loads(labels_path.read_text(encoding="utf-8"))
    labels = {str(item["id"]): str(item["name"]) for item in data.get("labels", [])}
    expected = {LIVE_LABEL_ID: "live", DEAD_LABEL_ID: "dead"}
    if labels != expected:
        raise ValueError(f"{labels_path} must define exactly {expected}; got {labels}")
    return labels


def load_index(index_path: Path) -> dict[str, Any]:
    data = json.loads(index_path.read_text(encoding="utf-8"))
    if data.get("axisOrder") != EXPECTED_AXIS_ORDER:
        raise ValueError(
            f"{index_path} axisOrder must be {EXPECTED_AXIS_ORDER}, got {data.get('axisOrder')}"
        )
    if data.get("timeCount") != EXPECTED_TIME_COUNT:
        raise ValueError(
            f"{index_path} timeCount must be {EXPECTED_TIME_COUNT}, got {data.get('timeCount')}"
        )
    if data.get("channelCount") != EXPECTED_CHANNEL_COUNT:
        raise ValueError(
            f"{index_path} channelCount must be {EXPECTED_CHANNEL_COUNT}, got {data.get('channelCount')}"
        )
    if data.get("zCount") != EXPECTED_Z_COUNT:
        raise ValueError(
            f"{index_path} zCount must be {EXPECTED_Z_COUNT}, got {data.get('zCount')}"
        )
    return data


def roi_metadata_by_index(index_data: dict[str, Any]) -> dict[int, dict[str, Any]]:
    by_index: dict[int, dict[str, Any]] = {}
    for roi_meta in index_data.get("rois", []):
        roi_index = int(roi_meta["roi"])
        by_index[roi_index] = roi_meta
    if not by_index:
        raise ValueError("ROI index.json does not contain any ROI metadata")
    return by_index


def parse_annotation_filename(annotation_path: Path) -> tuple[int, int, int]:
    stem = annotation_path.stem
    parts = stem.split("_")
    if len(parts) != 3 or not parts[0].startswith("C") or not parts[1].startswith("T") or not parts[2].startswith("Z"):
        raise ValueError(f"Unsupported annotation filename format: {annotation_path.name}")
    channel = int(parts[0][1:])
    time_index = int(parts[1][1:])
    z_index = int(parts[2][1:])
    return channel, time_index, z_index


def load_annotation_anchor(annotation_path: Path) -> AnnotationAnchor:
    channel, time_index, z_index = parse_annotation_filename(annotation_path)
    if z_index != 0:
        raise ValueError(f"Only Z0 annotations are supported, got {annotation_path.name}")
    payload = json.loads(annotation_path.read_text(encoding="utf-8"))
    label_id = str(payload["classificationLabelId"])
    if label_id not in {LIVE_LABEL_ID, DEAD_LABEL_ID}:
        raise ValueError(f"Unsupported classification label id {label_id!r} in {annotation_path}")
    return AnnotationAnchor(
        time_index=time_index,
        label_id=label_id,
        annotation_channel=channel,
        annotation_path=annotation_path,
    )


def parse_roi_name(roi_name: str) -> int:
    if not roi_name.startswith("Roi"):
        raise ValueError(f"ROI directory name must start with 'Roi', got {roi_name}")
    return int(roi_name[3:])


def resolve_roi_spec(
    annotation_dir: Path,
    *,
    roi_file_root: Path,
    roi_meta_by_index: dict[int, dict[str, Any]],
) -> RoiLabelSpec:
    roi_name = annotation_dir.name
    roi_index = parse_roi_name(roi_name)
    if roi_index not in roi_meta_by_index:
        raise ValueError(f"ROI {roi_name} is not present in index.json")

    anchors = sorted(
        (load_annotation_anchor(path) for path in annotation_dir.glob("*.json")),
        key=lambda anchor: anchor.time_index,
    )
    if not anchors:
        raise ValueError(f"No annotation JSON files found in {annotation_dir}")
    if len(anchors) > 2:
        raise ValueError(f"Expected at most 2 annotation JSON files in {annotation_dir}, got {len(anchors)}")

    for anchor in anchors:
        if anchor.annotation_channel != 0:
            warnings.warn(
                f"{anchor.annotation_path.name} is annotated on C{anchor.annotation_channel}; "
                "exporting C0 bright-field frames at the same timepoint.",
                stacklevel=2,
            )

    roi_file_name = str(roi_meta_by_index[roi_index]["fileName"])
    roi_tif_path = roi_file_root / roi_file_name
    if not roi_tif_path.exists():
        raise FileNotFoundError(f"ROI TIFF not found for {roi_name}: {roi_tif_path}")
    expected_shape = tuple(int(size) for size in roi_meta_by_index[roi_index]["shape"])
    if len(expected_shape) != 5:
        raise ValueError(f"ROI {roi_name} shape must have 5 dimensions, got {expected_shape}")

    if len(anchors) == 1:
        anchor = anchors[0]
        if anchor.label_id != LIVE_LABEL_ID:
            raise ValueError(
                f"Single-anchor ROI {roi_name} must have a live label, got {anchor.label_id}"
            )
        if anchor.time_index != EXPECTED_TIME_COUNT - 1:
            raise ValueError(
                f"Single-anchor ROI {roi_name} must be labeled at T{EXPECTED_TIME_COUNT - 1}, "
                f"got T{anchor.time_index}"
            )
        return RoiLabelSpec(
            roi_name=roi_name,
            roi_index=roi_index,
            roi_tif_path=roi_tif_path,
            expected_shape=expected_shape,
            live_anchor_t=anchor.time_index,
            dead_anchor_t=None,
            annotation_mode="single_live",
        )

    live_anchor, dead_anchor = anchors
    if live_anchor.label_id != LIVE_LABEL_ID or dead_anchor.label_id != DEAD_LABEL_ID:
        labels = [anchor.label_id for anchor in anchors]
        raise ValueError(f"ROI {roi_name} must be ordered live then dead, got {labels}")
    if live_anchor.time_index >= dead_anchor.time_index:
        raise ValueError(
            f"ROI {roi_name} live anchor T{live_anchor.time_index} must come before dead anchor "
            f"T{dead_anchor.time_index}"
        )

    return RoiLabelSpec(
        roi_name=roi_name,
        roi_index=roi_index,
        roi_tif_path=roi_tif_path,
        expected_shape=expected_shape,
        live_anchor_t=live_anchor.time_index,
        dead_anchor_t=dead_anchor.time_index,
        annotation_mode="live_to_dead",
    )


def load_roi_specs(input_root: Path, position: str) -> list[RoiLabelSpec]:
    load_labels(labels_json_path(input_root))
    roi_files_root = roi_root(input_root, position)
    annotations_root = annotation_root(input_root, position)
    index_data = load_index(roi_files_root / "index.json")
    roi_meta = roi_metadata_by_index(index_data)

    specs = [
        resolve_roi_spec(path, roi_file_root=roi_files_root, roi_meta_by_index=roi_meta)
        for path in sorted(annotations_root.iterdir())
        if path.is_dir()
    ]
    if not specs:
        raise ValueError(f"No ROI annotation directories found in {annotations_root}")
    return specs


def reshape_roi_stack(raw_stack: Any, spec: RoiLabelSpec) -> Any:
    shape = tuple(int(size) for size in raw_stack.shape)
    expected_shape = spec.expected_shape
    expected_prefix = expected_shape[:3]
    if expected_prefix != (EXPECTED_TIME_COUNT, EXPECTED_CHANNEL_COUNT, EXPECTED_Z_COUNT):
        raise ValueError(
            f"{spec.roi_tif_path} index.json shape must start with "
            f"({EXPECTED_TIME_COUNT}, {EXPECTED_CHANNEL_COUNT}, {EXPECTED_Z_COUNT}), "
            f"got {expected_shape}"
        )
    if shape == expected_shape:
        return raw_stack
    if len(shape) == 4 and shape == (
        expected_shape[0],
        expected_shape[1],
        expected_shape[3],
        expected_shape[4],
    ):
        return raw_stack.reshape(expected_shape)
    flattened_pages = expected_shape[0] * expected_shape[1] * expected_shape[2]
    if len(shape) == 3 and shape == (flattened_pages, expected_shape[3], expected_shape[4]):
        return raw_stack.reshape(expected_shape)
    raise ValueError(
        f"{spec.roi_tif_path} must reshape to {expected_shape}, got raw TIFF shape {shape}"
    )


def output_folder_name(dead_probability: float) -> str:
    if dead_probability <= 0.0:
        return "live"
    if dead_probability >= 1.0:
        return "dead"
    return "mixed"


def dead_probability_for_time(time_index: int, spec: RoiLabelSpec) -> float:
    if spec.dead_anchor_t is None:
        return 0.0

    live_anchor_t = spec.live_anchor_t
    dead_anchor_t = spec.dead_anchor_t
    if time_index <= live_anchor_t:
        return 0.0
    if time_index >= dead_anchor_t:
        return 1.0

    interior_count = dead_anchor_t - live_anchor_t - 1
    interior_index = time_index - live_anchor_t - 1
    live_count = math.floor(interior_count * 0.2)
    dead_count = math.floor(interior_count * 0.2)
    ramp_count = interior_count - live_count - dead_count

    if interior_index < live_count:
        return 0.0
    if interior_index >= live_count + ramp_count:
        return 1.0

    ramp_index = interior_index - live_count
    if ramp_count == 1:
        return 0.5
    return (ramp_index + 1) / (ramp_count + 1)


def format_probability(value: float) -> str:
    return f"{value:.6f}"


def ensure_output_dirs(output_root: Path) -> dict[str, Path]:
    images_root = output_root / "images"
    dirs = {
        "live": images_root / "live",
        "dead": images_root / "dead",
        "mixed": images_root / "mixed",
    }
    for path in dirs.values():
        path.mkdir(parents=True, exist_ok=True)
    return dirs


def convert_dataset(input_root: Path, output_root: Path, position: str = POSITION_NAME) -> ConversionSummary:
    input_root = input_root.resolve()
    output_root = output_root.resolve()
    output_dirs = ensure_output_dirs(output_root)
    labels_csv = output_root / "labels.csv"

    live_count = 0
    dead_count = 0
    mixed_count = 0
    warning_count = 0
    image_count = 0

    with warnings.catch_warnings(record=True) as caught_warnings:
        warnings.simplefilter("always")
        specs = load_roi_specs(input_root, position)

        with labels_csv.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=UNIFIED_LABEL_FIELDS,
            )
            writer.writeheader()

            for spec in specs:
                stack = reshape_roi_stack(tifffile.imread(spec.roi_tif_path), spec)
                for time_index in range(stack.shape[0]):
                    dead_probability = dead_probability_for_time(time_index, spec)
                    split_folder = output_folder_name(dead_probability)
                    file_name = f"{position}_{spec.roi_name}_T{time_index:03d}.tif"
                    image_path = output_dirs[split_folder] / file_name
                    tifffile.imwrite(image_path, stack[time_index, 0, 0])
                    writer.writerow(
                        {
                            "split_folder": split_folder,
                            "image_relpath": str(image_path.relative_to(output_root)),
                            "mask_relpath": "",
                            "target_type": "classification",
                            "position": position,
                            "roi": spec.roi_index,
                            "time_index": time_index,
                            "source_tif": str(spec.roi_tif_path),
                            "source_mask": "",
                            "width": stack.shape[4],
                            "height": stack.shape[3],
                            "live_anchor_t": spec.live_anchor_t,
                            "dead_anchor_t": "" if spec.dead_anchor_t is None else spec.dead_anchor_t,
                            "dead_probability": format_probability(dead_probability),
                            "annotation_mode": spec.annotation_mode,
                        }
                    )
                    image_count += 1
                    if split_folder == "live":
                        live_count += 1
                    elif split_folder == "dead":
                        dead_count += 1
                    else:
                        mixed_count += 1

        warning_count = len(caught_warnings)
        for warning in caught_warnings:
            print(f"Warning: {warning.message}")

    return ConversionSummary(
        roi_count=len(specs),
        image_count=image_count,
        live_count=live_count,
        dead_count=dead_count,
        mixed_count=mixed_count,
        warning_count=warning_count,
        labels_csv_path=labels_csv,
    )


def default_output_root(input_root: Path) -> Path:
    return input_root / DEFAULT_OUTPUT_DIRNAME


def print_summary(summary: ConversionSummary, output_root: Path) -> None:
    print(f"Wrote dataset to: {output_root}")
    print(f"Wrote labels CSV: {summary.labels_csv_path}")
    print(f"Annotated ROIs: {summary.roi_count}")
    print(f"Exported images: {summary.image_count}")
    print(f"Live images: {summary.live_count}")
    print(f"Mixed images: {summary.mixed_count}")
    print(f"Dead images: {summary.dead_count}")
    print(f"Warnings: {summary.warning_count}")
