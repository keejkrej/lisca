from __future__ import annotations

import json
import runpy
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/plot_paired_transfection.py"


def test_layout_rejects_unmatched_pair(tmp_path: Path) -> None:
    read_layout = runpy.run_path(str(SCRIPT))["read_layout"]
    path = tmp_path / "layout.csv"
    path.write_text(
        "sample,group,pair,series\nA,Cells,low,Control\nB,Cells,high,Variant\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="needs the same two series"):
        read_layout(path)


def test_expression_rate_scale_keeps_iqrs_but_not_extremes() -> None:
    iqr_limits = runpy.run_path(str(SCRIPT))["iqr_limits"]
    values = [np.array([0.001, 5, 6, 7, 1e6]), np.array([1, 10, 11, 12, 1e7])]
    lower, upper = iqr_limits(values)
    assert 0.001 < lower < 5 < 12 < upper < 1e6


def test_plot_command_reads_one_workspace_and_writes_four_figures(
    tmp_path: Path,
) -> None:
    pytest.importorskip("transfection")
    ws = tmp_path / "workspace"
    ws.mkdir()
    assay = {
        "type": "transfection",
        "name": "Synthetic comparison",
        "data": {"type": "nd2", "path": str(tmp_path / "unused.nd2")},
        "workspace": {"path": str(ws)},
        "interval": {"value": 15, "unit": "minute"},
        "analysis": {"channels": {"segmentation": 0, "signal": [1]}},
        "samples": [{"name": "A", "positions": "0:1"}, {"name": "B", "positions": "2"}],
    }
    config_path = ws / "assay.json"
    config_path.write_text(json.dumps(assay), encoding="utf-8")
    for i in range(3):
        pos = ws / "analysis" / f"Pos{i}"
        pos.mkdir(parents=True)
        (pos / "ch1.csv").write_text(
            "roi,t,area,background,sum,corrected\n"
            "0,0,1,0,1,1\n0,1,1,0,2,2\n0,2,1,0,3,3\n",
            encoding="utf-8",
        )
        (pos / "fit.csv").write_text(
            "roi,baseline_intensity,onset_time,expression_rate,"
            "mrna_lifetime,protein_lifetime,success\n0,1,0,3,5,10,true\n",
            encoding="utf-8",
        )
    layout = tmp_path / "pairs.csv"
    layout.write_text(
        "sample,group,pair,series\nA,Cells,low,Control\nB,Cells,low,Variant\n",
        encoding="utf-8",
    )
    out = tmp_path / "plots"
    cmd = [sys.executable, str(SCRIPT), str(ws), str(layout), "--out", str(out)]
    subprocess.run([*cmd, "--hours", "5"], check=True, capture_output=True, text=True)
    assert json.loads(config_path.read_text(encoding="utf-8")) == assay
    assert sorted(path.name for path in out.iterdir()) == [
        "01-Cells-expression_rate.png",
        "01-Cells-onset-vs-rate.png",
        "01-Cells-onset_time.png",
        "01-Cells-traces.png",
    ]
    for file in out.iterdir():
        assert file.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")

    (ws / "analysis/Pos2/ch1.csv").unlink()
    result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    assert result.returncode != 0
    assert "Missing 1 trace CSVs, e.g. Pos2/ch1.csv" in result.stderr
