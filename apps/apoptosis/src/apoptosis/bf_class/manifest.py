from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from lisca.data.manifest import (
    parse_optional_int,
    resolve_dataset_path,
    split_group_ids,
    split_records_by_roi,
    windows_relpath_to_path,
)


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
            if not image_path.exists():
                raise FileNotFoundError(f"Image path from labels.csv does not exist: {image_path}")
            records.append(
                ExampleRecord(
                    split_folder=row.get("split_folder", ""),
                    image_relpath=row["image_relpath"],
                    image_path=image_path,
                    position=row["position"],
                    roi=int(row["roi"]),
                    time_index=int(row["time_index"]),
                    dead_probability=float(row["dead_probability"]),
                    source_tif=row["source_tif"],
                    live_anchor_t=int(row.get("live_anchor_t", "0") or 0),
                    dead_anchor_t=parse_optional_int(row.get("dead_anchor_t")),
                    annotation_mode=row.get("annotation_mode", ""),
                )
            )
    if not records:
        raise ValueError(f"No rows found in {labels_csv}")
    return records
