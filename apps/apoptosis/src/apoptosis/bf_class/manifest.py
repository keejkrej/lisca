from __future__ import annotations

import csv
import random
from dataclasses import dataclass
from pathlib import Path, PureWindowsPath

from .config import TRAIN_FRACTION, VAL_FRACTION


@dataclass(frozen=True)
class ExampleRecord:
    split_folder: str
    image_relpath: str
    image_path: Path
    position: str
    roi: int
    time_index: int
    dead_probability: float
    source_tif: str
    live_anchor_t: int
    dead_anchor_t: int | None
    annotation_mode: str

    @property
    def roi_group(self) -> str:
        return f"{self.position}_roi{self.roi:03d}"


def windows_relpath_to_path(relative_path: str) -> Path:
    return Path(*PureWindowsPath(relative_path).parts)


def parse_optional_int(value: str) -> int | None:
    stripped = value.strip()
    return int(stripped) if stripped else None


def load_manifest(dataset_root: Path) -> list[ExampleRecord]:
    dataset_root = dataset_root.resolve()
    labels_csv = dataset_root / "labels.csv"
    if not labels_csv.exists():
        raise FileNotFoundError(f"labels.csv not found at {labels_csv}")

    records: list[ExampleRecord] = []
    with labels_csv.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            image_path = (dataset_root / windows_relpath_to_path(row["image_relpath"])).resolve()
            if not image_path.exists():
                raise FileNotFoundError(f"Image path from labels.csv does not exist: {image_path}")
            records.append(
                ExampleRecord(
                    split_folder=row["split_folder"],
                    image_relpath=row["image_relpath"],
                    image_path=image_path,
                    position=row["position"],
                    roi=int(row["roi"]),
                    time_index=int(row["time_index"]),
                    dead_probability=float(row["dead_probability"]),
                    source_tif=row["source_tif"],
                    live_anchor_t=int(row["live_anchor_t"]),
                    dead_anchor_t=parse_optional_int(row["dead_anchor_t"]),
                    annotation_mode=row["annotation_mode"],
                )
            )
    if not records:
        raise ValueError(f"No rows found in {labels_csv}")
    return records


def split_group_ids(group_ids: list[str], seed: int) -> dict[str, set[str]]:
    if len(group_ids) < 3:
        raise ValueError("At least 3 ROI groups are required for train/val/test splitting")

    shuffled = list(group_ids)
    random.Random(seed).shuffle(shuffled)

    train_count = int(round(len(shuffled) * TRAIN_FRACTION))
    train_count = min(max(train_count, 1), len(shuffled) - 2)
    val_count = int(round(len(shuffled) * VAL_FRACTION))
    val_count = min(max(val_count, 1), len(shuffled) - train_count - 1)
    test_count = len(shuffled) - train_count - val_count
    if test_count <= 0:
        test_count = 1
        if train_count >= val_count:
            train_count -= 1
        else:
            val_count -= 1

    train_ids = set(shuffled[:train_count])
    val_ids = set(shuffled[train_count : train_count + val_count])
    test_ids = set(shuffled[train_count + val_count : train_count + val_count + test_count])
    return {"train": train_ids, "val": val_ids, "test": test_ids}


def split_records_by_roi(records: list[ExampleRecord], seed: int) -> dict[str, list[ExampleRecord]]:
    split_ids = split_group_ids(sorted({record.roi_group for record in records}), seed=seed)
    split_records: dict[str, list[ExampleRecord]] = {"train": [], "val": [], "test": []}
    for record in records:
        if record.roi_group in split_ids["train"]:
            split_records["train"].append(record)
        elif record.roi_group in split_ids["val"]:
            split_records["val"].append(record)
        elif record.roi_group in split_ids["test"]:
            split_records["test"].append(record)
        else:
            raise AssertionError(f"Record {record.image_path} was not assigned to a split")
    return split_records
