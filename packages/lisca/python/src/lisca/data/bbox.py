from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RoiBox:
    roi: int
    x: int
    y: int
    w: int
    h: int


def read_bbox_csv(csv_path: Path) -> list[RoiBox]:
    rows: list[RoiBox] = []
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        expected = {"roi", "x", "y", "w", "h"}
        if reader.fieldnames is None or set(reader.fieldnames) != expected:
            raise ValueError(
                f"{csv_path} must contain exactly the columns roi,x,y,w,h; got {reader.fieldnames}"
            )
        for row in reader:
            rows.append(
                RoiBox(
                    roi=int(row["roi"]),
                    x=int(row["x"]),
                    y=int(row["y"]),
                    w=int(row["w"]),
                    h=int(row["h"]),
                )
            )
    if not rows:
        raise ValueError(f"No ROI rows found in {csv_path}")
    return rows


def clip_roi(roi: RoiBox, *, height: int, width: int) -> tuple[slice, slice, int, int]:
    x0 = min(max(roi.x, 0), width)
    y0 = min(max(roi.y, 0), height)
    x1 = min(max(roi.x + roi.w, 0), width)
    y1 = min(max(roi.y + roi.h, 0), height)
    if x1 <= x0 or y1 <= y0:
        raise ValueError(
            f"ROI {roi.roi} does not overlap the frame after clipping: "
            f"(x={roi.x}, y={roi.y}, w={roi.w}, h={roi.h}), frame={width}x{height}"
        )
    return slice(y0, y1), slice(x0, x1), x1 - x0, y1 - y0
