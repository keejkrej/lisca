from __future__ import annotations

import pytest

from lisca.analysis.events import first_sustained_threshold_crossing, first_sustained_true


def test_first_sustained_true_returns_start_of_first_long_enough_run() -> None:
    assert first_sustained_true([False, True, False, True, True], hold_frames=1) == 1
    assert first_sustained_true([False, True, False, True, True], hold_frames=2) == 3


def test_first_sustained_true_returns_none_without_long_enough_run() -> None:
    assert first_sustained_true([False, True, False, True], hold_frames=2) is None
    assert first_sustained_true([], hold_frames=1) is None


def test_first_sustained_true_requires_positive_hold_frames() -> None:
    with pytest.raises(ValueError, match="--hold-frames must be >= 1"):
        first_sustained_true([True], hold_frames=0, parameter_name="--hold-frames")


def test_first_sustained_threshold_crossing_returns_series_index() -> None:
    assert first_sustained_threshold_crossing(
        [0.1, 0.7, 0.4, 0.8, 0.9],
        threshold=0.5,
        hold_frames=2,
    ) == 3


def test_first_sustained_threshold_crossing_supports_gate() -> None:
    assert first_sustained_threshold_crossing(
        [0.1, 0.7, 0.8, 0.9],
        threshold=0.5,
        hold_frames=2,
        gate=[False, True, False, True],
    ) is None
    assert first_sustained_threshold_crossing(
        [0.1, 0.7, 0.8, 0.9],
        threshold=0.5,
        hold_frames=2,
        gate=[False, True, True, True],
    ) == 1


def test_first_sustained_threshold_crossing_supports_lte_direction() -> None:
    assert first_sustained_threshold_crossing(
        [0.9, 0.7, 0.4, 0.3],
        threshold=0.5,
        hold_frames=2,
        direction="lte",
    ) == 2


def test_first_sustained_threshold_crossing_requires_matching_gate_length() -> None:
    with pytest.raises(ValueError, match="gate length"):
        first_sustained_threshold_crossing(
            [0.1, 0.7],
            threshold=0.5,
            hold_frames=1,
            gate=[True],
        )
