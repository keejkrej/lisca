from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal, cast

# Reject above 4096 pins. Raise the cap if a position needs more samples than that.
MAX_ALIGN_DRIFT_KEYFRAMES = 4096
_MAX_U32 = 4_294_967_295


@dataclass(frozen=True)
class DriftKeyframe:
    time: int
    dx: float
    dy: float


@dataclass(frozen=True)
class AlignDrift:
    reference_time: int
    interpolation: Literal["linear"]
    keyframes: tuple[DriftKeyframe, ...]


class _Unset:
    pass


_UNSET = _Unset()


def align_drift_from_json(data: object) -> AlignDrift:
    if not isinstance(data, dict):
        raise ValueError("align drift must be an object")
    # ty treats a bare dict as dict[Never, Never] after isinstance.
    fields = cast(dict[str, object], data)
    reference_time = _u32(fields.get("referenceTime"), "referenceTime")
    if fields.get("interpolation") != "linear":
        raise ValueError('align drift interpolation must be "linear"')
    raw_keyframes = fields.get("keyframes", [])
    if not isinstance(raw_keyframes, list):
        raise ValueError("align drift keyframes must be an array")
    if len(raw_keyframes) > MAX_ALIGN_DRIFT_KEYFRAMES:
        raise ValueError("align drift has more than 4096 keyframes")
    seen: set[int] = set()
    keyframes: list[DriftKeyframe] = []
    for raw in raw_keyframes:
        if not isinstance(raw, dict):
            raise ValueError("align drift keyframe must be an object")
        keyframe = cast(dict[str, object], raw)
        time = _u32(keyframe.get("time"), "time")
        dx = _finite(keyframe.get("dx"), "dx")
        dy = _finite(keyframe.get("dy"), "dy")
        if time in seen:
            raise ValueError(f"align drift has duplicate keyframe time {time}")
        seen.add(time)
        keyframes.append(DriftKeyframe(time=time, dx=dx, dy=dy))
    return AlignDrift(
        reference_time=reference_time,
        interpolation="linear",
        keyframes=tuple(keyframes),
    )


def align_drift_to_save(
    drift: AlignDrift | None,
    assay_default_time: int | None | _Unset = _UNSET,
) -> AlignDrift | None:
    if drift is None:
        return None
    if (
        not drift.keyframes
        and not isinstance(assay_default_time, _Unset)
        and isinstance(assay_default_time, int)
        and not isinstance(assay_default_time, bool)
        and drift.reference_time == assay_default_time
    ):
        return None
    return drift


def interpolate_align_drift(
    drift: AlignDrift | None, time: float
) -> tuple[float, float]:
    if drift is None or not drift.keyframes:
        return (0.0, 0.0)
    samples = [
        (keyframe.time, keyframe.dx, keyframe.dy) for keyframe in drift.keyframes
    ]
    if all(sample[0] != drift.reference_time for sample in samples):
        samples.append((drift.reference_time, 0.0, 0.0))
    samples.sort(key=lambda sample: sample[0])
    first = samples[0]
    last = samples[-1]
    if time <= first[0]:
        return (first[1], first[2])
    if time >= last[0]:
        return (last[1], last[2])
    for index in range(len(samples) - 1):
        left = samples[index]
        right = samples[index + 1]
        if time > right[0]:
            continue
        span = right[0] - left[0]
        u = 0.0 if span == 0 else (time - left[0]) / span
        return (
            left[1] + (right[1] - left[1]) * u,
            left[2] + (right[2] - left[2]) * u,
        )
    return (last[1], last[2])


def _u32(value: object, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"align drift {name} must be a non-negative integer")
    if isinstance(value, float) and not value.is_integer():
        raise ValueError(f"align drift {name} must be a non-negative integer")
    number = int(value)
    if number < 0 or number > _MAX_U32:
        raise ValueError(f"align drift {name} must be a non-negative integer")
    return number


def _finite(value: object, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"align drift {name} must be a finite number")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"align drift {name} must be a finite number")
    return number
