from __future__ import annotations

import json
from pathlib import Path

import pytest

from lisca.core.assay_positions import load_assay_positions


def _write_assay(root: Path, payload: dict[str, object]) -> None:
    (root / "assay.json").write_text(json.dumps(payload), encoding="utf-8")


def _folder_source(tmp_path: Path) -> Path:
    source = tmp_path / "images"
    for name in ("Pos10", "Pos30", "Pos20"):
        (source / name).mkdir(parents=True)
    return source


def test_version_1_folder_indices_become_folder_numbers(tmp_path: Path) -> None:
    source = _folder_source(tmp_path)
    workspace = tmp_path / "ws"
    workspace.mkdir()
    _write_assay(
        workspace,
        {
            "data": {
                "type": "folder",
                "path": str(source),
                "template": {"subfolder": "Pos{p}", "filename": "img_{t}"},
            },
            "positionIndexVersion": 1,
            "samples": [
                {"name": "early", "positions": "0:1"},
                {"name": "last", "positions": "2"},
            ],
        },
    )

    loaded = load_assay_positions(workspace)

    assert loaded.samples == {"early": [10, 20], "last": [30]}
    assert loaded.file_positions == [10, 20, 30]


def test_legacy_folder_number_stays_the_folder_id(tmp_path: Path) -> None:
    source = _folder_source(tmp_path)
    workspace = tmp_path / "ws"
    workspace.mkdir()
    _write_assay(
        workspace,
        {
            "data": {
                "type": "folder",
                "path": str(source),
                "template": {"subfolder": "Pos{p}", "filename": "img_{t}"},
            },
            "samples": [{"name": "one", "positions": "30"}],
        },
    )

    assert load_assay_positions(workspace).samples == {"one": [30]}


def test_version_1_index_past_the_source_is_refused(tmp_path: Path) -> None:
    source = _folder_source(tmp_path)
    workspace = tmp_path / "ws"
    workspace.mkdir()
    _write_assay(
        workspace,
        {
            "data": {
                "type": "folder",
                "path": str(source),
                "template": {"subfolder": "Pos{p}", "filename": "img_{t}"},
            },
            "positionIndexVersion": 1,
            "samples": [{"name": "one", "positions": "3"}],
        },
    )

    with pytest.raises(ValueError, match="Re-select positions on Metadata"):
        load_assay_positions(workspace)


def test_nd2_indices_resolve_without_opening_a_missing_file(tmp_path: Path) -> None:
    workspace = tmp_path / "ws"
    workspace.mkdir()
    _write_assay(
        workspace,
        {
            "data": {"type": "nd2", "path": str(tmp_path / "missing.nd2")},
            "positionIndexVersion": 1,
            "samples": [{"name": "first", "positions": "0:1"}],
        },
    )

    assert load_assay_positions(workspace).samples == {"first": [0, 1]}


def test_missing_samples_points_at_metadata(tmp_path: Path) -> None:
    workspace = tmp_path / "ws"
    workspace.mkdir()
    _write_assay(
        workspace,
        {"data": {"type": "nd2", "path": str(tmp_path / "missing.nd2")}, "samples": []},
    )

    with pytest.raises(ValueError, match="Studio Metadata"):
        load_assay_positions(workspace)
