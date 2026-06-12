from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SmartExclusionSample:
    path: Path
    label: int
    position: int
    split: str


def load_dataset_manifest(dataset_root: Path) -> dict:
    manifest_path = dataset_root / "manifest.json"
    if not manifest_path.is_file():
        msg = f"missing dataset manifest: {manifest_path}"
        raise FileNotFoundError(msg)
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def load_smart_exclusion_samples(
    dataset_root: Path,
    *,
    split: str | None = None,
) -> list[SmartExclusionSample]:
    metadata_path = dataset_root / "metadata.csv"
    if not metadata_path.is_file():
        msg = f"missing dataset metadata: {metadata_path}"
        raise FileNotFoundError(msg)

    samples: list[SmartExclusionSample] = []
    with metadata_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            row_split = row["split"]
            if split is not None and row_split != split:
                continue
            samples.append(
                SmartExclusionSample(
                    path=dataset_root / row["path"],
                    label=int(row["label"]),
                    position=int(row["position"]),
                    split=row_split,
                )
            )
    if not samples:
        msg = f"no samples found in {metadata_path} for split={split!r}"
        raise ValueError(msg)
    return samples
