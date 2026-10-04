from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from lisca.core.align_drift import (
    AlignDrift,
    DriftKeyframe,
    align_drift_from_json,
    align_drift_to_save,
    interpolate_align_drift,
)
from lisca.core.paths import align_json_path
from lisca.core.workspace import load_saved_align_state


def _grid() -> dict[str, object]:
    return {
        "enabled": True,
        "shape": "hex",
        "tx": -14.241622479137703,
        "ty": -3.5606093532684326,
        "rotation": -0.5304764131892945,
        "spacingA": 131.25854646669146,
        "spacingB": 131.25854646669146,
        "patternWidth": 92.39499304589708,
        "patternHeight": 92.39499304589708,
        "opacity": 0.35,
    }


def _write_align(workspace: Path, position: int, payload: dict[str, object]) -> None:
    path = align_json_path(workspace, position)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _pins() -> AlignDrift:
    return AlignDrift(
        reference_time=0,
        interpolation="linear",
        keyframes=(
            DriftKeyframe(time=400, dx=6.0, dy=-2.5),
            DriftKeyframe(time=875, dx=14.0, dy=-4.0),
        ),
    )


def test_parse_drift_ignores_unknown_keys_and_missing_drift(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    _write_align(
        workspace,
        61,
        {
            "grid": _grid(),
            "excludedPatterns": [],
            "future": True,
            "drift": {
                "referenceTime": 0,
                "interpolation": "linear",
                "note": "ignored",
                "keyframes": [
                    {"time": 400, "dx": 6, "dy": -2.5, "extra": 1},
                    {"time": 875, "dx": 14.0, "dy": -4.0},
                ],
            },
        },
    )
    loaded = load_saved_align_state(workspace, 61)
    assert loaded.drift == _pins()

    _write_align(workspace, 71, {"grid": _grid(), "excludedPatterns": []})
    assert load_saved_align_state(workspace, 71).drift is None


def test_parse_keeps_empty_keyframes_and_rejects_bad_samples() -> None:
    empty = align_drift_from_json(
        {"referenceTime": 875, "interpolation": "linear", "keyframes": []}
    )
    assert empty.reference_time == 875
    assert empty.keyframes == ()
    assert interpolate_align_drift(empty, 0) == (0.0, 0.0)
    assert interpolate_align_drift(empty, 900) == (0.0, 0.0)

    with pytest.raises(ValueError, match="duplicate keyframe time 400"):
        align_drift_from_json(
            {
                "referenceTime": 0,
                "interpolation": "linear",
                "keyframes": [
                    {"time": 400, "dx": 1, "dy": 0},
                    {"time": 400, "dx": 2, "dy": 0},
                ],
            }
        )
    with pytest.raises(ValueError, match="non-negative integer"):
        align_drift_from_json(
            {
                "referenceTime": 0,
                "interpolation": "linear",
                "keyframes": [{"time": -1, "dx": 0, "dy": 0}],
            }
        )
    with pytest.raises(ValueError, match="finite"):
        align_drift_from_json(
            {
                "referenceTime": 0,
                "interpolation": "linear",
                "keyframes": [{"time": 1, "dx": math.nan, "dy": 0}],
            }
        )


def test_omit_empty_reference_only_when_it_matches_a_passed_default() -> None:
    empty_zero = AlignDrift(reference_time=0, interpolation="linear", keyframes=())
    empty_end = AlignDrift(reference_time=875, interpolation="linear", keyframes=())
    assert align_drift_to_save(empty_zero, 0) is None
    assert align_drift_to_save(empty_end, 0) == empty_end
    assert align_drift_to_save(empty_zero) == empty_zero
    assert align_drift_to_save(empty_end) == empty_end
    assert align_drift_to_save(empty_zero, None) == empty_zero
    assert align_drift_to_save(None) is None
    assert align_drift_to_save(_pins(), 0) == _pins()


def test_interpolate_matches_the_reference_line() -> None:
    drift = _pins()
    assert interpolate_align_drift(drift, 0) == (0.0, 0.0)
    assert interpolate_align_drift(drift, 200) == (3.0, -1.25)
    assert interpolate_align_drift(drift, 400) == (6.0, -2.5)
    assert interpolate_align_drift(drift, 875) == (14.0, -4.0)
    assert interpolate_align_drift(drift, 900) == (14.0, -4.0)
    reversed_pins = AlignDrift(
        reference_time=0,
        interpolation="linear",
        keyframes=(drift.keyframes[1], drift.keyframes[0]),
    )
    assert interpolate_align_drift(reversed_pins, 200) == (3.0, -1.25)
