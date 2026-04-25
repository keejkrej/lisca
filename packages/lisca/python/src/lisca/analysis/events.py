from __future__ import annotations

from collections.abc import Iterable
from typing import Literal


def first_sustained_true(
    mask: Iterable[bool],
    hold_frames: int,
    *,
    parameter_name: str = "hold_frames",
) -> int | None:
    """Return the first index where a boolean condition stays true long enough."""

    if hold_frames < 1:
        raise ValueError(f"{parameter_name} must be >= 1, got {hold_frames}")

    run_length = 0
    for idx, is_active in enumerate(mask):
        run_length = run_length + 1 if bool(is_active) else 0
        if run_length >= hold_frames:
            return idx - hold_frames + 1
    return None


def first_sustained_threshold_crossing(
    values: Iterable[float],
    *,
    threshold: float,
    hold_frames: int,
    direction: Literal["gte", "lte"] = "gte",
    gate: Iterable[bool] | None = None,
    parameter_name: str = "hold_frames",
) -> int | None:
    """Return the first index where values cross a threshold for enough frames."""

    values_seq = list(values)
    gate_seq = list(gate) if gate is not None else None
    if gate_seq is not None and len(gate_seq) != len(values_seq):
        raise ValueError(
            f"gate length must match values length, got {len(gate_seq)} and {len(values_seq)}"
        )

    if direction == "gte":
        mask = (value >= threshold for value in values_seq)
    elif direction == "lte":
        mask = (value <= threshold for value in values_seq)
    else:
        raise ValueError(f"Unsupported direction {direction!r}")

    if gate_seq is not None:
        mask = (is_crossing and is_allowed for is_crossing, is_allowed in zip(mask, gate_seq))

    return first_sustained_true(mask, hold_frames, parameter_name=parameter_name)
