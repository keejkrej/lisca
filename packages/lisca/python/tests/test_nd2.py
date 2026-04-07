from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import numpy as np

from lisca.data.nd2 import build_frame_lookup, channel_name, read_frame_2d, relative_time_ms


class FakeHandle:
    def __init__(
        self,
        *,
        sizes: dict[str, int],
        loop_indices: tuple[dict[str, int], ...],
        frames: list[np.ndarray],
        metadata_channels: list[str] | None = None,
        relative_times_ms: list[float] | None = None,
    ) -> None:
        self.sizes = sizes
        self.loop_indices = loop_indices
        self._frames = frames
        names = metadata_channels or [f"channel_{i}" for i in range(sizes.get("C", 1))]
        self.metadata = SimpleNamespace(
            channels=[SimpleNamespace(channel=SimpleNamespace(name=name)) for name in names]
        )
        self._relative_times_ms = relative_times_ms or [float(i) for i in range(sizes.get("T", 1))]

    def read_frame(self, index: int) -> np.ndarray:
        return self._frames[index]

    def frame_metadata(self, index: int) -> Any:
        if "T" in {axis for frame in self.loop_indices for axis in frame}:
            timepoint = self.loop_indices[index].get("T", 0)
        else:
            timepoint = 0
        t_ms = self._relative_times_ms[timepoint]
        return SimpleNamespace(
            channels=[
                SimpleNamespace(time=SimpleNamespace(relativeTimeMs=t_ms))
                for _ in range(self.sizes.get("C", 1))
            ]
        )


def test_read_frame_2d_extracts_in_pixel_channel() -> None:
    handle = FakeHandle(
        sizes={"P": 1, "T": 1, "C": 2, "Z": 1, "Y": 2, "X": 3},
        loop_indices=({},),
        frames=[
            np.array(
                [
                    [[1, 2, 3], [4, 5, 6]],
                    [[10, 11, 12], [13, 14, 15]],
                ],
                dtype=np.uint16,
            )
        ],
    )

    lookup = build_frame_lookup(handle)
    frame = read_frame_2d(handle, lookup, 0, 0, 1, 0)

    np.testing.assert_array_equal(frame, np.array([[10, 11, 12], [13, 14, 15]], dtype=np.uint16))


def test_channel_name_and_relative_time_ms_use_metadata() -> None:
    handle = FakeHandle(
        sizes={"P": 1, "T": 2, "C": 2, "Z": 1, "Y": 1, "X": 1},
        loop_indices=({"P": 0, "T": 0}, {"P": 0, "T": 1}),
        frames=[
            np.array([[[1]], [[2]]], dtype=np.uint16),
            np.array([[[3]], [[4]]], dtype=np.uint16),
        ],
        metadata_channels=["BF", "Cy5"],
        relative_times_ms=[1000.0, 61000.0],
    )

    lookup = build_frame_lookup(handle)

    assert channel_name(handle, 1) == "Cy5"
    assert relative_time_ms(handle, lookup, 0, 1, 1) == 61000.0
