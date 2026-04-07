from __future__ import annotations

import csv
import random
from dataclasses import dataclass
from pathlib import Path, PureWindowsPath

from .config import TRAIN_FRACTION, VAL_FRACTION


@dataclass(frozen=True)
class ExampleRecord:
    image_relpath: str
    mask_relpath: str
    image_path: Path
    mask_path: Path
    position: str
    roi: int
    time_index: int
    source_tif: str
    source_mask: str
    width: int
    height: int

    @property
    def roi_group(self) -> str:
        return f"{self.position}_roi{self.roi:03d}"


def windows_relpath_to_path(relative_path: str) -> Path:
    return Path(*PureWindowsPath(relative_path).parts)


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
            mask_path = (dataset_root / windows_relpath_to_path(row["mask_relpath"])).resolve()
            if not image_path.exists():
                raise FileNotFoundError(f"Image path from labels.csv does not exist: {image_path}")
            if not mask_path.exists():
                raise FileNotFoundError(f"Mask path from labels.csv does not exist: {mask_path}")
            records.append(
                ExampleRecord(
                    image_relpath=row["image_relpath"],
                    mask_relpath=row["mask_relpath"],
                    image_path=image_path,
                    mask_path=mask_path,
                    position=row["position"],
                    roi=int(row["roi"]),
                    time_index=int(row["time_index"]),
                    source_tif=row["source_tif"],
                    source_mask=row["source_mask"],
                    width=int(row["width"]),
                    height=int(row["height"]),
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

    return {
        "train": set(shuffled[:train_count]),
        "val": set(shuffled[train_count : train_count + val_count]),
        "test": set(shuffled[train_count + val_count : train_count + val_count + test_count]),
    }


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
