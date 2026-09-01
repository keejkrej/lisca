"""Open an ND2/CZI source for frame-by-frame crop reads."""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

import numpy as np

from lisca.readers.base import ImageInfo
from lisca.readers.czi import CZIReader
from lisca.readers.nd2 import ND2Reader

_READERS = (ND2Reader(), CZIReader())


def open_reader(
    path: Path,
) -> tuple[ImageInfo, Callable[[int, int, int, int], np.ndarray], Callable[[], None]]:
    """Open a source and return shape info plus frame accessor and closer."""
    path = Path(path)
    suffix = path.suffix.lower()
    for reader in _READERS:
        if suffix in reader.suffixes:
            session = reader.open(path)
            return session.info, session.read_frame, session.close
    raise ValueError(f"Unsupported source format for crop: {suffix}")
