"""Unit tests for cpsam labeling helpers that do not require cellpose."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from lisca.services.cpsam_label import (
    LabelCpsamOptions,
    resolve_positions,
    resolve_times,
    _mask_boundary,
)


def test_resolve_times_stride() -> None:
    options = LabelCpsamOptions(workspace=Path("."), output=Path("."), time_stride=20)
    assert resolve_times(181, options) == list(range(0, 181, 20))


def test_resolve_times_explicit() -> None:
    options = LabelCpsamOptions(
        workspace=Path("."), output=Path("."), times=[0, 10, 200]
    )
    assert resolve_times(181, options) == [0, 10]


def test_resolve_times_invalid() -> None:
    options = LabelCpsamOptions(workspace=Path("."), output=Path("."), times=[999])
    with pytest.raises(ValueError, match="no valid"):
        resolve_times(10, options)


def test_resolve_positions_from_roi_dirs(tmp_path: Path) -> None:
    for position in (63, 64, 70):
        (tmp_path / "roi" / f"Pos{position}").mkdir(parents=True)
    assert resolve_positions(tmp_path, None) == [63, 64, 70]
    assert resolve_positions(tmp_path, [70, 63]) == [63, 70]


def test_mask_boundary_is_ring() -> None:
    mask = np.zeros((10, 10), dtype=bool)
    mask[2:8, 2:8] = True
    edge = _mask_boundary(mask)
    assert edge[2, 2]
    assert not edge[4, 4]
    assert edge.sum() > 0
