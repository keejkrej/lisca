from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import pytest

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


def test_write_auc_boxplot_shows_counts_under_x_labels(tmp_path: Path) -> None:
    df = pd.DataFrame(
        [
            {"slide_channel": 0, "auc": 10.0},
            {"slide_channel": 0, "auc": 12.0},
            {"slide_channel": 1, "auc": 20.0},
        ]
    )
    output_plot = tmp_path / "auc.png"

    captured: dict[str, object] = {}
    original_subplots = plt.subplots

    def wrapped_subplots(*args, **kwargs):
        fig, ax = original_subplots(*args, **kwargs)
        captured["ax"] = ax
        return fig, ax

    plt.subplots = wrapped_subplots
    try:
        plot_auc.write_auc_boxplot(df, output_plot, color="#c03a2b", title=None)
    finally:
        plt.subplots = original_subplots

    ax = captured["ax"]
    assert [tick.get_text() for tick in ax.get_xticklabels()] == ["0\n(n=2)", "1\n(n=1)"]


def test_write_auc_boxplot_uses_log_y_scale(tmp_path: Path) -> None:
    df = pd.DataFrame(
        [
            {"slide_channel": 0, "auc": 10.0},
            {"slide_channel": 0, "auc": 12.0},
            {"slide_channel": 0, "auc": 20.0},
            {"slide_channel": 0, "auc": 100.0},
            {"slide_channel": 1, "auc": 8.0},
            {"slide_channel": 1, "auc": 9.0},
            {"slide_channel": 1, "auc": 10.0},
            {"slide_channel": 1, "auc": 11.0},
        ]
    )
    output_plot = tmp_path / "auc.png"

    captured: dict[str, object] = {}
    original_subplots = plt.subplots

    def wrapped_subplots(*args, **kwargs):
        fig, ax = original_subplots(*args, **kwargs)
        captured["ax"] = ax
        return fig, ax

    plt.subplots = wrapped_subplots
    try:
        plot_auc.write_auc_boxplot(df, output_plot, color="#c03a2b", title=None)
    finally:
        plt.subplots = original_subplots

    ax = captured["ax"]
    assert ax.get_yscale() == "log"
    assert ax.get_ylim()[0] > 0
    assert ax.get_ylim()[1] > ax.get_ylim()[0]
