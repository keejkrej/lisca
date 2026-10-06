from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

from lisca.compare_batches import BridgeError, bridge_onto, compare, control_scale


def _workspace(
    root: Path,
    name: str,
    *,
    baseline: float,
    rate: float,
    corrected: float,
) -> Path:
    workspace = root / name
    (workspace / "analysis" / "Pos0").mkdir(parents=True)
    (workspace / "assay.json").write_text(
        json.dumps(
            {
                "samples": [
                    {"name": "eGFP", "positions": "0"},
                    {"name": "blank", "positions": "1"},
                ]
            }
        ),
        encoding="utf-8",
    )
    fit = "\n".join(
        [
            "roi,baseline_intensity,onset_time,expression_rate,mrna_lifetime,protein_lifetime,success",
            f"1,{baseline},{10},{rate},{80},{200},true",
            f"2,{baseline + 2},{12},{rate * 3},{90},{210},true",
            f"3,{baseline},{11},{0},{80},{200},false",
        ]
    )
    fit_path = workspace / "analysis" / "Pos0" / "fit.csv"
    fit_path.write_text(fit + "\n", encoding="utf-8")
    trace = "\n".join(
        [
            "roi,t,area,background,sum,corrected",
            f"1,0,1,0,1,{corrected}",
            f"1,1,1,0,1,{corrected + 4}",
        ]
    )
    trace_path = workspace / "analysis" / "Pos0" / "ch0.csv"
    trace_path.write_text(trace + "\n", encoding="utf-8")
    return workspace


def test_bridge_matches_control_medians() -> None:
    reference = control_scale([10.0, 12.0], [4.0, 12.0])
    query = control_scale([25.0, 27.0], [8.0, 24.0])
    bridge = bridge_onto(reference, query)
    assert reference.baseline_intensity == 11.0
    assert reference.expression_rate == 8.0
    assert bridge.gain == 0.5
    assert bridge.offset == 11.0 - 0.5 * 26.0


def test_non_expressing_control_is_rejected() -> None:
    with pytest.raises(BridgeError, match="positive"):
        control_scale([1.0], [0.0])


def test_compare_without_controls_does_not_rescale(tmp_path: Path) -> None:
    workspace_a = _workspace(tmp_path, "plate-a", baseline=10, rate=4, corrected=10)
    workspace_b = _workspace(tmp_path, "plate-b", baseline=25, rate=8, corrected=25)
    out = tmp_path / "comparison"
    bridge = compare(workspace_a, workspace_b, out)
    assert bridge is None
    assert not (out / "bridge.json").exists()
    with (out / "fits.csv").open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert "baseline_intensity_harmonized" not in rows[0]
    assert {row["batch"] for row in rows} == {"plate-a", "plate-b"}
    assert any(row["sample"] == "eGFP" and row["success"] == "false" for row in rows)


def test_compare_with_controls_rescales_the_second_workspace(tmp_path: Path) -> None:
    workspace_a = _workspace(tmp_path, "plate-a", baseline=10, rate=4, corrected=10)
    workspace_b = _workspace(tmp_path, "plate-b", baseline=30, rate=8, corrected=30)
    out = tmp_path / "comparison"
    bridge = compare(workspace_a, workspace_b, out, control_a="eGFP", control_b="eGFP")
    assert bridge is not None
    assert bridge.gain == 0.5
    payload = json.loads((out / "bridge.json").read_text(encoding="utf-8"))
    assert payload["gain"] == 0.5
    with (out / "traces.csv").open(encoding="utf-8", newline="") as handle:
        traces = list(csv.DictReader(handle))
    kept = next(row for row in traces if row["batch"] == "plate-a" and row["t"] == "0")
    moved = next(row for row in traces if row["batch"] == "plate-b" and row["t"] == "0")
    assert kept["corrected_harmonized"] == kept["corrected"]
    expected = bridge.gain * 30 + bridge.offset
    assert float(moved["corrected_harmonized"]) == pytest.approx(expected)
    with (out / "fits.csv").open(encoding="utf-8", newline="") as handle:
        fits = list(csv.DictReader(handle))
    query = next(row for row in fits if row["batch"] == "plate-b" and row["roi"] == "1")
    assert float(query["expression_rate_harmonized"]) == pytest.approx(bridge.gain * 8)
    assert query["onset_time"] == "10"


def test_compare_rejects_one_control_name(tmp_path: Path) -> None:
    workspace_a = _workspace(tmp_path, "plate-a", baseline=10, rate=4, corrected=10)
    workspace_b = _workspace(tmp_path, "plate-b", baseline=30, rate=8, corrected=30)
    with pytest.raises(BridgeError, match="both"):
        compare(workspace_a, workspace_b, tmp_path / "out", control_a="eGFP")
