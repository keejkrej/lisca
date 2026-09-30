from __future__ import annotations

import json
from pathlib import Path

import pytest

from lisca.migrations import MIGRATIONS, migrate_workspace
from lisca.migrations.align_excluded_patterns import migrate_align_excluded_patterns
from lisca.migrations.assay_samples_by_name import migrate_assay_samples_by_name
from lisca.migrations.bbox_crop_to_roi import migrate_bbox_crop_to_roi
from lisca.migrations.killing_traces_dir import migrate_killing_traces_dir


def _write_assay(workspace: Path, data: object) -> Path:
    workspace.mkdir(parents=True, exist_ok=True)
    path = workspace / "assay.json"
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return path


def _legacy_assay() -> dict:
    return {
        "version": 1,
        "samples": [
            {"slideChannel": 0, "name": "Control", "positions": "0-3"},
            {"slideChannel": 1, "name": "  ", "positions": "4-7"},
        ],
        "analysis": {
            "maxOnsetMinutes": 90,
            "channels": {"mask": 0, "signal": [1]},
            "sampleChannels": [{"slideChannel": 1, "mask": 2, "signal": [3, 4]}],
        },
        "extra": True,
    }


def test_registered_in_order() -> None:
    assert MIGRATIONS == (
        migrate_bbox_crop_to_roi,
        migrate_align_excluded_patterns,
        migrate_assay_samples_by_name,
        migrate_killing_traces_dir,
    )


def test_assay_rewrites_to_samples_by_name(tmp_path: Path) -> None:
    path = _write_assay(tmp_path, _legacy_assay())

    assert migrate_workspace(tmp_path) == [str(path.resolve())]

    text = path.read_text(encoding="utf-8")
    assert text.endswith("}\n")
    data = json.loads(text)
    assert data == {
        "version": 1,
        "samples": [
            {"name": "Control", "positions": "0-3"},
            {"name": "Sample 1", "positions": "4-7"},
        ],
        "analysis": {
            "maxOnsetMinutes": 90,
            "channels": {"segmentation": 0, "signal": [1]},
            "sampleChannels": [
                {"sample": "Sample 1", "segmentation": 2, "signal": [3, 4]}
            ],
        },
        "extra": True,
    }
    # Renamed keys keep the old key's place.
    assert list(data["analysis"]["channels"]) == ["segmentation", "signal"]
    assert list(data["analysis"]["sampleChannels"][0]) == [
        "sample",
        "segmentation",
        "signal",
    ]
    assert text.startswith('{\n  "version": 1,')


def test_assay_migration_is_idempotent(tmp_path: Path) -> None:
    path = _write_assay(tmp_path, _legacy_assay())
    migrate_workspace(tmp_path)
    after_first = path.read_text(encoding="utf-8")

    assert migrate_workspace(tmp_path) == []
    assert path.read_text(encoding="utf-8") == after_first


def test_assay_migration_noop_for_current_shape(tmp_path: Path) -> None:
    current = {
        "samples": [{"name": "A", "positions": "0"}],
        "analysis": {
            "channels": {"segmentation": 0, "signal": [1]},
            "sampleChannels": [{"sample": "A", "segmentation": 0, "signal": [1]}],
        },
    }
    path = _write_assay(tmp_path, current)
    original = path.read_text(encoding="utf-8")

    assert migrate_assay_samples_by_name(tmp_path) == []
    assert path.read_text(encoding="utf-8") == original


def test_assay_migration_noop_without_assay_json(tmp_path: Path) -> None:
    assert migrate_assay_samples_by_name(tmp_path) == []
    assert not (tmp_path / "assay.json").exists()


def test_assay_migration_errors_on_duplicate_names(tmp_path: Path) -> None:
    path = _write_assay(
        tmp_path,
        {
            "samples": [
                {"slideChannel": 0, "name": "A", "positions": "0"},
                {"slideChannel": 1, "name": " A ", "positions": "1"},
            ]
        },
    )
    original = path.read_text(encoding="utf-8")

    with pytest.raises(ValueError, match="duplicate sample names \\('A'\\)"):
        migrate_workspace(tmp_path)
    assert path.read_text(encoding="utf-8") == original


def test_assay_migration_errors_when_blank_fill_collides(tmp_path: Path) -> None:
    _write_assay(
        tmp_path,
        {
            "samples": [
                {"slideChannel": 0, "name": "Sample 1", "positions": "0"},
                {"slideChannel": 1, "name": "", "positions": "1"},
            ]
        },
    )

    with pytest.raises(ValueError, match="duplicate sample names \\('Sample 1'\\)"):
        migrate_workspace(tmp_path)


def test_assay_migration_errors_on_mask_and_segmentation(tmp_path: Path) -> None:
    _write_assay(
        tmp_path,
        {"analysis": {"channels": {"mask": 0, "segmentation": 1, "signal": [2]}}},
    )

    with pytest.raises(ValueError, match="both `mask` and `segmentation`"):
        migrate_workspace(tmp_path)


def test_assay_migration_errors_on_row_mask_and_segmentation(tmp_path: Path) -> None:
    data = _legacy_assay()
    data["analysis"]["sampleChannels"][0]["segmentation"] = 5
    _write_assay(tmp_path, data)

    with pytest.raises(
        ValueError, match=r"sampleChannels\[0\] has both `mask` and `segmentation`"
    ):
        migrate_workspace(tmp_path)


def test_assay_migration_errors_on_slide_channel_and_sample(tmp_path: Path) -> None:
    data = _legacy_assay()
    data["analysis"]["sampleChannels"][0]["sample"] = "Control"
    _write_assay(tmp_path, data)

    with pytest.raises(ValueError, match="both `slideChannel` and `sample`"):
        migrate_workspace(tmp_path)


def test_assay_migration_errors_on_unknown_slide_channel(tmp_path: Path) -> None:
    data = _legacy_assay()
    data["analysis"]["sampleChannels"][0]["slideChannel"] = 7
    _write_assay(tmp_path, data)

    with pytest.raises(ValueError, match="slideChannel 7 matches no samples"):
        migrate_workspace(tmp_path)


def _write_tree(root: Path, files: dict[str, bytes]) -> None:
    for rel, content in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)


def test_killing_traces_dir_renamed(tmp_path: Path) -> None:
    _write_tree(tmp_path / "timeseries", {"Pos0/ch1.csv": b"roi,t,p_dead\n0,0,0.1\n"})

    assert migrate_workspace(tmp_path) == [str((tmp_path / "traces").resolve())]

    assert not (tmp_path / "timeseries").exists()
    assert (tmp_path / "traces/Pos0/ch1.csv").read_bytes() == (
        b"roi,t,p_dead\n0,0,0.1\n"
    )
    assert migrate_workspace(tmp_path) == []


def test_killing_traces_dir_noop_without_timeseries(tmp_path: Path) -> None:
    assert migrate_killing_traces_dir(tmp_path) == []
    _write_tree(tmp_path / "traces", {"Pos0/ch1.csv": b"x"})
    assert migrate_killing_traces_dir(tmp_path) == []
    assert (tmp_path / "traces/Pos0/ch1.csv").read_bytes() == b"x"


def test_killing_traces_dir_removes_empty_timeseries(tmp_path: Path) -> None:
    (tmp_path / "timeseries" / "Pos0").mkdir(parents=True)
    _write_tree(tmp_path / "traces", {"Pos0/ch1.csv": b"x"})

    assert migrate_killing_traces_dir(tmp_path) == [str(tmp_path / "traces")]
    assert not (tmp_path / "timeseries").exists()
    assert (tmp_path / "traces/Pos0/ch1.csv").read_bytes() == b"x"


def test_killing_traces_dir_removes_identical_timeseries(tmp_path: Path) -> None:
    files = {"Pos0/ch1.csv": b"a", "Pos1/ch1.csv": b"b"}
    _write_tree(tmp_path / "timeseries", files)
    _write_tree(tmp_path / "traces", files)

    assert migrate_killing_traces_dir(tmp_path) == [str(tmp_path / "traces")]
    assert not (tmp_path / "timeseries").exists()


@pytest.mark.parametrize(
    "traces_files",
    [
        {"Pos0/ch1.csv": b"different"},
        {"Pos0/ch1.csv": b"a", "Pos2/ch1.csv": b"extra"},
    ],
)
def test_killing_traces_dir_errors_when_both_differ(
    tmp_path: Path, traces_files: dict[str, bytes]
) -> None:
    _write_tree(tmp_path / "timeseries", {"Pos0/ch1.csv": b"a"})
    _write_tree(tmp_path / "traces", traces_files)

    with pytest.raises(ValueError, match="different contents"):
        migrate_workspace(tmp_path)
    assert (tmp_path / "timeseries/Pos0/ch1.csv").read_bytes() == b"a"
