from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from lisca.data.manifest import (
    resolve_dataset_path,
    split_group_ids,
    split_records_by_roi,
    windows_relpath_to_path,
)


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


def load_manifest(dataset_root: Path) -> list[ExampleRecord]:
    dataset_root = dataset_root.resolve()
    labels_csv = dataset_root / "labels.csv"
    if not labels_csv.exists():
        raise FileNotFoundError(f"labels.csv not found at {labels_csv}")

    records: list[ExampleRecord] = []
    with labels_csv.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            image_path = resolve_dataset_path(dataset_root, row["image_relpath"])
            mask_path = resolve_dataset_path(dataset_root, row["mask_relpath"])
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
                    source_mask=row.get("source_mask", ""),
                    width=int(row.get("width", "0") or 0),
                    height=int(row.get("height", "0") or 0),
                )
            )
    if not records:
        raise ValueError(f"No rows found in {labels_csv}")
    return records
