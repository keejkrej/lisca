from __future__ import annotations

import random
from pathlib import Path, PureWindowsPath
from typing import Protocol, TypeVar


TRAIN_FRACTION = 0.70
VAL_FRACTION = 0.15
UNIFIED_LABEL_FIELDS = [
    "image_relpath",
    "mask_relpath",
    "target_type",
    "split_folder",
    "position",
    "roi",
    "time_index",
    "source_tif",
    "source_mask",
    "width",
    "height",
    "live_anchor_t",
    "dead_anchor_t",
    "dead_probability",
    "annotation_mode",
]


class RoiGroupedRecord(Protocol):
    @property
    def roi_group(self) -> str: ...


RecordT = TypeVar("RecordT", bound=RoiGroupedRecord)


def windows_relpath_to_path(relative_path: str) -> Path:
    return Path(*PureWindowsPath(relative_path).parts)


def resolve_dataset_path(dataset_root: Path, relative_path: str) -> Path:
    return (dataset_root / windows_relpath_to_path(relative_path)).resolve()


def parse_optional_int(value: str | None) -> int | None:
    stripped = "" if value is None else value.strip()
    return int(stripped) if stripped else None


def split_group_ids(
    group_ids: list[str],
    seed: int,
    *,
    train_fraction: float = TRAIN_FRACTION,
    val_fraction: float = VAL_FRACTION,
) -> dict[str, set[str]]:
    if len(group_ids) < 3:
        raise ValueError("At least 3 ROI groups are required for train/val/test splitting")

    shuffled = list(group_ids)
    random.Random(seed).shuffle(shuffled)

    train_count = int(round(len(shuffled) * train_fraction))
    train_count = min(max(train_count, 1), len(shuffled) - 2)
    val_count = int(round(len(shuffled) * val_fraction))
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


def split_records_by_roi(records: list[RecordT], seed: int) -> dict[str, list[RecordT]]:
    split_ids = split_group_ids(sorted({record.roi_group for record in records}), seed=seed)
    split_records: dict[str, list[RecordT]] = {"train": [], "val": [], "test": []}
    for record in records:
        if record.roi_group in split_ids["train"]:
            split_records["train"].append(record)
        elif record.roi_group in split_ids["val"]:
            split_records["val"].append(record)
        elif record.roi_group in split_ids["test"]:
            split_records["test"].append(record)
        else:
            raise AssertionError(f"Record {record.roi_group} was not assigned to a split")
    return split_records
