"""CZI reader adapter."""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

import numpy as np

from lisca.readers.base import ImageInfo, ReaderSession, ensure_2d


class CZIReader:
    """Read 2D frames from a CZI file by (pos, time, channel, z)."""

    suffixes = (".czi",)

    @staticmethod
    def _axis_size(ranges: Mapping[str, tuple[int, int]], axis: str) -> int:
        start, stop = ranges.get(axis, (0, 1))
        if start < 0 or stop < start:
            raise ValueError(
                f"Invalid bounding range for axis {axis}: {(start, stop)!r}"
            )
        return stop - start

    def open(self, path: Path) -> ReaderSession:
        from pylibCZIrw import czi as pyczi  # ty: ignore[unresolved-import]

        cm = pyczi.open_czi(str(path))
        handle = cm.__enter__()
        total_bounding_box = handle.total_bounding_box
        scenes_bounding = handle.scenes_bounding_rectangle
        has_scenes = len(scenes_bounding) > 0
        scene_ids: list[object] = list(scenes_bounding) if has_scenes else []
        n_pos = len(scene_ids) if has_scenes else 1
        n_time = self._axis_size(total_bounding_box, "T")
        n_chan = self._axis_size(total_bounding_box, "C")
        n_z = self._axis_size(total_bounding_box, "Z")
        include_channel = n_chan > 1
        info = ImageInfo(n_pos=n_pos, n_time=n_time, n_chan=n_chan, n_z=n_z)
        scene_ids_tuple = tuple(scene_ids)

        def read_frame(p: int, t: int, c: int, z: int) -> np.ndarray:
            plane: dict[str, int] = {"T": t, "Z": z}
            if include_channel:
                plane["C"] = c
            kwargs: dict[str, object] = {"plane": plane}
            if scene_ids:
                kwargs["scene"] = scene_ids_tuple[p]
            return ensure_2d(np.asarray(handle.read(**kwargs)))

        def close() -> None:
            close_method = getattr(cm, "__exit__", None)
            if callable(close_method):
                close_method(None, None, None)
            else:
                raise ValueError("Unable to close CZI handle correctly")

        return ReaderSession(info=info, read_frame=read_frame, close=close)
