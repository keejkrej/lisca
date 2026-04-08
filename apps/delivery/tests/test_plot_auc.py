from __future__ import annotations

from pathlib import Path

import pandas as pd

from delivery.expression import plot_auc


def test_load_auc_csv_requires_slide_channel(tmp_path: Path) -> None:
    auc_csv = tmp_path / "auc.csv"
    pd.DataFrame([{"auc": 1.0, "roi": 0}]).to_csv(auc_csv, index=False)

    try:
        plot_auc.load_auc_csv(auc_csv)
    except ValueError as exc:
        assert "slide_channel" in str(exc)
    else:
        raise AssertionError("Expected ValueError for missing slide_channel column")


def test_cli_writes_boxplot(tmp_path: Path) -> None:
    auc_csv = tmp_path / "slide_ch001_timeseries_auc.csv"
    pd.DataFrame(
        [
            {"source_csv": "slide_sc0_ch001_timeseries.csv", "slide_channel": 0, "pos": 0, "channel": 1, "roi": 0, "auc": 10.0},
            {"source_csv": "slide_sc0_ch001_timeseries.csv", "slide_channel": 0, "pos": 0, "channel": 1, "roi": 1, "auc": 12.0},
            {"source_csv": "slide_sc1_ch001_timeseries.csv", "slide_channel": 1, "pos": 12, "channel": 1, "roi": 0, "auc": 20.0},
            {"source_csv": "slide_sc1_ch001_timeseries.csv", "slide_channel": 1, "pos": 12, "channel": 1, "roi": 1, "auc": 22.0},
        ]
    ).to_csv(auc_csv, index=False)

    plot_auc.cli(auc_csv=auc_csv, output_plot=None, color="#c03a2b", title="AUC by slide channel")

    assert (tmp_path / "slide_ch001_timeseries_auc.png").is_file()
