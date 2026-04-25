from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import tifffile
from PIL import Image

from lisca.data.manifest import UNIFIED_LABEL_FIELDS


DEFAULT_OUTPUT_DIRNAME = "bf_seg_dataset"
EXPECTED_AXIS_ORDER = "TCZYX"
BACKGROUND_CLASS_ID = 0
LIVE_CLASS_ID = 1
DEAD_CLASS_ID = 2
VALID_MASK_VALUES = {BACKGROUND_CLASS_ID, LIVE_CLASS_ID, DEAD_CLASS_ID}


@dataclass(frozen=True)
class AnnotatedFrameSpec:
    position: str
    roi_name: str
    roi_index: int
    roi_tif_path: Path
    mask_path: Path
    annotation_path: Path
    expected_shape: tuple[int, int, int, int, int]
    time_index: int

    @property
    def sample_name(self) -> str:
        return f"{self.position}_{self.roi_name}_T{self.time_index:03d}"


@dataclass(frozen=True)
class ConversionSummary:
    annotated_frame_count: int
    position_count: int
    roi_count: int
    labels_csv_path: Path


def annotation_root(input_root: Path) -> Path:
    return input_root / "annotations" / "roi"


def roi_root(input_root: Path) -> Path:
    return input_root / "roi"


def load_index(index_path: Path) -> dict[str, Any]:
    data = json.loads(index_path.read_text(encoding="utf-8"))
    if data.get("axisOrder") != EXPECTED_AXIS_ORDER:
        raise ValueError(
            f"{index_path} axisOrder must be {EXPECTED_AXIS_ORDER}, got {data.get('axisOrder')}"
        )
    if int(data.get("channelCount", 0)) < 1:
        raise ValueError(f"{index_path} channelCount must be at least 1")
    if int(data.get("zCount", 0)) != 1:
        raise ValueError(f"{index_path} zCount must be 1, got {data.get('zCount')}")
    return data


def roi_metadata_by_index(index_data: dict[str, Any]) -> dict[int, dict[str, Any]]:
    by_index: dict[int, dict[str, Any]] = {}
    for roi_meta in index_data.get("rois", []):
        by_index[int(roi_meta["roi"])] = roi_meta
    if not by_index:
        raise ValueError("ROI index.json does not contain any ROI metadata")
    return by_index


def parse_annotation_filename(annotation_path: Path) -> tuple[int, int, int]:
    stem = annotation_path.stem
    parts = stem.split("_")
    if len(parts) != 3 or not parts[0].startswith("C") or not parts[1].startswith("T") or not parts[2].startswith("Z"):
        raise ValueError(f"Unsupported annotation filename format: {annotation_path.name}")
    return int(parts[0][1:]), int(parts[1][1:]), int(parts[2][1:])


def parse_roi_name(roi_name: str) -> int:
    if not roi_name.startswith("Roi"):
        raise ValueError(f"ROI directory name must start with 'Roi', got {roi_name}")
    return int(roi_name[3:])


def resolve_annotation_spec(
    annotation_path: Path,
    *,
    position: str,
    roi_meta_by_index: dict[int, dict[str, Any]],
    roi_files_root: Path,
) -> AnnotatedFrameSpec:
    channel_index, time_index, z_index = parse_annotation_filename(annotation_path)
    if channel_index != 0:
        raise ValueError(f"Only channel 0 annotations are supported, got {annotation_path.name}")
    if z_index != 0:
        raise ValueError(f"Only Z0 annotations are supported, got {annotation_path.name}")

    payload = json.loads(annotation_path.read_text(encoding="utf-8"))
    if payload.get("classificationLabelId") is not None:
        raise ValueError(
            f"{annotation_path} uses classificationLabelId={payload.get('classificationLabelId')!r}; "
            "segmentation annotations must use maskFileName only."
        )

    mask_file_name = payload.get("maskFileName")
    if not isinstance(mask_file_name, str) or not mask_file_name:
        raise ValueError(f"{annotation_path} is missing a valid maskFileName")
    mask_path = annotation_path.with_name(mask_file_name)
    if not mask_path.exists():
        raise FileNotFoundError(f"Mask PNG not found for {annotation_path}: {mask_path}")

    roi_name = annotation_path.parent.name
    roi_index = parse_roi_name(roi_name)
    if roi_index not in roi_meta_by_index:
        raise ValueError(f"{annotation_path.parent} is not present in index.json")

    roi_meta = roi_meta_by_index[roi_index]
    roi_tif_path = roi_files_root / str(roi_meta["fileName"])
    if not roi_tif_path.exists():
        raise FileNotFoundError(f"ROI TIFF not found for {annotation_path.parent}: {roi_tif_path}")
    expected_shape = tuple(int(size) for size in roi_meta["shape"])
    if len(expected_shape) != 5:
        raise ValueError(f"ROI {roi_name} shape must have 5 dimensions, got {expected_shape}")
    if not 0 <= time_index < expected_shape[0]:
        raise ValueError(
            f"{annotation_path} time index T{time_index} is outside ROI stack length {expected_shape[0]}"
        )

    return AnnotatedFrameSpec(
        position=position,
        roi_name=roi_name,
        roi_index=roi_index,
        roi_tif_path=roi_tif_path,
        mask_path=mask_path,
        annotation_path=annotation_path,
        expected_shape=expected_shape,
        time_index=time_index,
    )


def load_annotation_specs(input_root: Path, positions: list[str] | None = None) -> list[AnnotatedFrameSpec]:
    annotations_root = annotation_root(input_root)
    roi_files_root = roi_root(input_root)
    if positions is None:
        selected_positions = sorted(path.name for path in annotations_root.iterdir() if path.is_dir())
    else:
        selected_positions = sorted(set(positions))
    if not selected_positions:
        raise ValueError(f"No annotated positions found in {annotations_root}")

    specs: list[AnnotatedFrameSpec] = []
    for position in selected_positions:
        annotation_position_root = annotations_root / position
        if not annotation_position_root.exists():
            raise FileNotFoundError(f"Annotation position directory not found: {annotation_position_root}")
        index_data = load_index(roi_files_root / position / "index.json")
        roi_meta = roi_metadata_by_index(index_data)
        for roi_dir in sorted(path for path in annotation_position_root.iterdir() if path.is_dir()):
            for annotation_path in sorted(roi_dir.glob("*.json")):
                specs.append(
                    resolve_annotation_spec(
                        annotation_path,
                        position=position,
                        roi_meta_by_index=roi_meta,
                        roi_files_root=roi_files_root / position,
                    )
                )
    if not specs:
        raise ValueError(f"No annotation JSON files found in {annotations_root}")
    return specs


def reshape_roi_stack(raw_stack: Any, spec: AnnotatedFrameSpec) -> np.ndarray:
    expected_shape = spec.expected_shape
    shape = tuple(int(size) for size in raw_stack.shape)
    if shape == expected_shape:
        return np.asarray(raw_stack)
    if len(shape) == 4 and shape == (
        expected_shape[0],
        expected_shape[1],
        expected_shape[3],
        expected_shape[4],
    ):
        return np.asarray(raw_stack).reshape(expected_shape)
    flattened_pages = expected_shape[0] * expected_shape[1] * expected_shape[2]
    if len(shape) == 3 and shape == (flattened_pages, expected_shape[3], expected_shape[4]):
        return np.asarray(raw_stack).reshape(expected_shape)
    raise ValueError(
        f"{spec.roi_tif_path} must reshape to {expected_shape}, got raw TIFF shape {shape}"
    )


def read_mask_array(mask_path: Path) -> np.ndarray:
    with Image.open(mask_path) as image:
        mask = np.asarray(image)
    if mask.ndim == 2:
        mask_array = mask.astype(np.uint8, copy=False)
    elif mask.ndim == 3 and mask.shape[2] in {3, 4}:
        rgb = mask[:, :, :3]
        if not (np.array_equal(rgb[:, :, 0], rgb[:, :, 1]) and np.array_equal(rgb[:, :, 1], rgb[:, :, 2])):
            raise ValueError(f"{mask_path} RGB channels do not agree on class ids")
        mask_array = rgb[:, :, 0].astype(np.uint8, copy=False)
    else:
        raise ValueError(f"{mask_path} must decode to a 2D or RGB/RGBA array, got shape {mask.shape}")

    unique_values = set(int(value) for value in np.unique(mask_array))
    unexpected_values = unique_values - VALID_MASK_VALUES
    if unexpected_values:
        raise ValueError(f"{mask_path} contains unsupported class ids: {sorted(unexpected_values)}")
    return mask_array


def ensure_output_dirs(output_root: Path) -> dict[str, Path]:
    output_dirs = {
        "images": output_root / "images",
        "masks": output_root / "masks",
    }
    for path in output_dirs.values():
        path.mkdir(parents=True, exist_ok=True)
    return output_dirs


def convert_dataset(
    input_root: Path,
    output_root: Path,
    *,
    positions: list[str] | None = None,
) -> ConversionSummary:
    input_root = input_root.resolve()
    output_root = output_root.resolve()
    output_dirs = ensure_output_dirs(output_root)
    labels_csv_path = output_root / "labels.csv"
    specs = load_annotation_specs(input_root, positions=positions)

    with labels_csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=UNIFIED_LABEL_FIELDS,
        )
        writer.writeheader()

        for spec in specs:
            stack = reshape_roi_stack(tifffile.imread(spec.roi_tif_path), spec)
            image_array = np.asarray(stack[spec.time_index, 0, 0])
            mask_array = read_mask_array(spec.mask_path)
            if image_array.shape != mask_array.shape:
                raise ValueError(
                    f"Image/mask shape mismatch for {spec.sample_name}: "
                    f"image {image_array.shape}, mask {mask_array.shape}"
                )

            image_path = output_dirs["images"] / f"{spec.sample_name}.tif"
            mask_path = output_dirs["masks"] / f"{spec.sample_name}.png"
            tifffile.imwrite(image_path, image_array)
            Image.fromarray(mask_array, mode="L").save(mask_path)

            writer.writerow(
                {
                    "image_relpath": str(image_path.relative_to(output_root)),
                    "mask_relpath": str(mask_path.relative_to(output_root)),
                    "target_type": "segmentation",
                    "split_folder": "",
                    "position": spec.position,
                    "roi": spec.roi_index,
                    "time_index": spec.time_index,
                    "source_tif": str(spec.roi_tif_path),
                    "source_mask": str(spec.mask_path),
                    "width": image_array.shape[1],
                    "height": image_array.shape[0],
                    "live_anchor_t": "",
                    "dead_anchor_t": "",
                    "dead_probability": "",
                    "annotation_mode": "mask",
                }
            )

    return ConversionSummary(
        annotated_frame_count=len(specs),
        position_count=len({spec.position for spec in specs}),
        roi_count=len({(spec.position, spec.roi_index) for spec in specs}),
        labels_csv_path=labels_csv_path,
    )


def default_output_root(input_root: Path) -> Path:
    return input_root / DEFAULT_OUTPUT_DIRNAME


def print_summary(summary: ConversionSummary, output_root: Path) -> None:
    print(f"Wrote dataset to: {output_root}")
    print(f"Wrote labels CSV: {summary.labels_csv_path}")
    print(f"Annotated frames: {summary.annotated_frame_count}")
    print(f"Annotated positions: {summary.position_count}")
    print(f"Annotated ROI tracks: {summary.roi_count}")
