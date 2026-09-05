from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

FILENAME_PATTERN = re.compile(
    r"^img_channel(?P<channel>\d+)_position(?P<position>\d+)_time(?P<time>\d+)_z(?P<z>\d+)\.(?:tif|tiff|png|jpg|jpeg)$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class SourceFrameRequest:
    position: int
    time: int = 0
    channel: int = 0
    z: int = 0


def scan_folder_positions(source_root: Path) -> list[int]:
    positions: list[int] = []
    for path in sorted(source_root.iterdir()):
        if path.is_dir() and path.name.startswith("Pos"):
            suffix = path.name.removeprefix("Pos")
            if suffix.isdigit():
                positions.append(int(suffix))
    return positions


def find_source_frame_path(source_root: Path, request: SourceFrameRequest) -> Path:
    position_dir = source_root / f"Pos{request.position}"
    if not position_dir.is_dir():
        msg = f"source position directory not found: {position_dir}"
        raise FileNotFoundError(msg)

    matches: list[Path] = []
    for path in position_dir.iterdir():
        if not path.is_file():
            continue
        parsed = FILENAME_PATTERN.match(path.name)
        if parsed is None:
            continue
        if (
            int(parsed.group("position")) == request.position
            and int(parsed.group("time")) == request.time
            and int(parsed.group("channel")) == request.channel
            and int(parsed.group("z")) == request.z
        ):
            matches.append(path)

    if not matches:
        msg = (
            f"requested frame not found for Pos{request.position} "
            f"t={request.time} c={request.channel} z={request.z}"
        )
        raise FileNotFoundError(msg)
    return sorted(matches)[0]


def load_source_frame(path: Path) -> np.ndarray:
    ext = path.suffix.lower().lstrip(".")
    if ext in ("tif", "tiff"):
        frame = tifffile.imread(path)
    else:
        frame = np.asarray(Image.open(path))
    return np.asarray(frame, dtype=np.float64)
