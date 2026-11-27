from pathlib import Path

import pytest

from lisca.core.trace_coverage import require_trace_coverage


def _write_csv(workspace: Path, path: str) -> None:
    csv = workspace / "analysis" / path
    csv.parent.mkdir(parents=True, exist_ok=True)
    csv.write_text("roi,t,corrected\n0,0,1\n", encoding="utf-8")


def test_partial_trace_run_lists_missing_positions_and_channels(tmp_path: Path) -> None:
    _write_csv(tmp_path, "Pos0/ch1.csv")
    _write_csv(tmp_path, "Pos3/auc.csv")

    with pytest.raises(ValueError) as error:
        require_trace_coverage(tmp_path, [(0, 1), (3, 1), (3, 2)])

    assert "1/3 expected CSVs" in str(error.value)
    assert "Missing: Pos3/ch1.csv, Pos3/ch2.csv" in str(error.value)


def test_old_traces_outside_assay_scope_are_reported(tmp_path: Path) -> None:
    _write_csv(tmp_path, "Pos0/ch1.csv")
    _write_csv(tmp_path, "Pos1/ch1.csv")
    _write_csv(tmp_path, "Pos0/ch0.csv")

    with pytest.raises(ValueError) as error:
        require_trace_coverage(tmp_path, [(0, 1)])

    assert "Outside assay scope: Pos0/ch0.csv, Pos1/ch1.csv" in str(error.value)


def test_complete_intentional_subset_passes(tmp_path: Path) -> None:
    _write_csv(tmp_path, "Pos7/ch1.csv")
    _write_csv(tmp_path, "Pos7/ch2.csv")
    _write_csv(tmp_path, "Pos8/fit.csv")
    _write_csv(tmp_path, "Pos8/ch_notes.csv")

    require_trace_coverage(tmp_path, [(7, 1), (7, 2)])
