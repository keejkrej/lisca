from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np


@dataclass(frozen=True)
class FrameLookup:
    sequence_axes: tuple[str, ...]
    index_by_coords: dict[tuple[int, ...], int]


def build_frame_lookup(handle: Any) -> FrameLookup:
    loop_indices = tuple(handle.loop_indices)
    if not loop_indices:
        return FrameLookup(sequence_axes=(), index_by_coords={(): 0})

    sequence_axes = tuple(
        axis for axis in ("P", "T", "C", "Z") if any(axis in frame_indices for frame_indices in loop_indices)
    )
    index_by_coords = {
        tuple(frame_indices.get(axis, 0) for axis in sequence_axes): seq_index
        for seq_index, frame_indices in enumerate(loop_indices)
    }
    return FrameLookup(sequence_axes=sequence_axes, index_by_coords=index_by_coords)


def read_frame_2d(handle: Any, lookup: FrameLookup, p: int, t: int, c: int, z: int = 0) -> np.ndarray:
    coords = {"P": p, "T": t, "C": c, "Z": z}
    seq_key = tuple(coords[axis] for axis in lookup.sequence_axes)
    if seq_key not in lookup.index_by_coords:
        raise ValueError(f"No ND2 frame found for coordinates P={p}, T={t}, C={c}, Z={z}")

    seq_index = lookup.index_by_coords[seq_key]
    frame = np.asarray(handle.read_frame(seq_index))

    if "C" not in lookup.sequence_axes and handle.sizes.get("C", 1) > 1:
        if frame.ndim >= 3 and frame.shape[0] == handle.sizes["C"]:
            frame = frame[c]
        elif frame.ndim >= 3 and frame.shape[-1] == handle.sizes["C"]:
            frame = frame[..., c]
        else:
            raise ValueError("Unable to locate the channel axis in ND2 frame data for in-pixel channels")

    if frame.ndim == 3 and frame.shape[0] == 1:
        frame = frame[0]
    elif frame.ndim == 3 and frame.shape[-1] == 1:
        frame = frame[..., 0]

    if frame.ndim != 2:
        raise ValueError(f"Expected a 2D frame, got shape={frame.shape}")

    return np.asarray(frame)


def validate_nd2_indices(handle: Any, pos: int, channel: int) -> None:
    n_pos = handle.sizes.get("P", 1)
    n_chan = handle.sizes.get("C", 1)
    if pos < 0 or pos >= n_pos:
        raise ValueError(f"--pos must be between 0 and {n_pos - 1}, got {pos}")
    if channel < 0 or channel >= n_chan:
        raise ValueError(f"--channel must be between 0 and {n_chan - 1}, got {channel}")


def channel_name(handle: Any, channel: int) -> str | None:
    metadata = getattr(handle, "metadata", None)
    channels = getattr(metadata, "channels", None)
    if channels is None or channel >= len(channels):
        return None

    candidate = channels[channel]
    nested = getattr(candidate, "channel", None)
    name = getattr(nested, "name", None)
    if name is not None:
        return str(name)
    fallback_name = getattr(candidate, "name", None)
    return str(fallback_name) if fallback_name is not None else None


def relative_time_ms(handle: Any, lookup: FrameLookup, pos: int, t: int, channel: int) -> float:
    coords = {"P": pos, "T": t, "C": channel, "Z": 0}
    seq_key = tuple(coords[axis] for axis in lookup.sequence_axes)
    seq_index = lookup.index_by_coords[seq_key]
    metadata = handle.frame_metadata(seq_index)
    channels = getattr(metadata, "channels", None)
    if channels:
        selected_channel = channels[min(channel, len(channels) - 1)]
        time_info = getattr(selected_channel, "time", None)
        relative_time = getattr(time_info, "relativeTimeMs", None)
        if relative_time is not None:
            return float(relative_time)
    raise ValueError(f"ND2 frame metadata does not expose relativeTimeMs for P={pos}, T={t}")
