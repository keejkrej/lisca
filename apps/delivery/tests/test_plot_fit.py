from __future__ import annotations

import math
from pathlib import Path

import matplotlib.pyplot as plt
import pytest

from delivery.expression import plot_fit


def write_fit_csv(csv_path: Path) -> None:
    csv_path.write_text(
        "\n".join(
            [
                "slide_channel,pos,roi,intensity_offset,protein_decay_rate,mrna_decay_rate,expression_onset,expression_amplitude,success",
                "0,12,0,2.0,0.05,0.35,0.0,40.0,true",
                "0,12,1,2.5,0.06,0.4,0.0,32.0,true",
                "1,14,0,3.0,0.08,0.7,0.0,16.0,true",
                "1,14,1,,,,,,false",
            ]
        ),
        encoding="utf-8",
    )


def write_timeseries_csv(csv_path: Path) -> None:
    csv_path.write_text(
        "\n".join(
            [
                "pos,roi,t,corrected",
                *[
                    f"12,0,{frame},{2.0 + 40.0 * (math.exp(-0.05 * frame) - math.exp(-0.35 * frame))}"
                    for frame in range(6)
                ],
                *[
                    f"12,1,{frame},{2.5 + 32.0 * (math.exp(-0.06 * frame) - math.exp(-0.4 * frame))}"
                    for frame in range(6)
                ],
            ]
        ),
        encoding="utf-8",
    )


def test_default_output_plot_paths_strip_fit_suffix(tmp_path: Path) -> None:
    fit_csv = tmp_path / "slide_ch001_timeseries_fit.csv"

    output_paths = plot_fit.default_output_plot_paths(fit_csv, output_dir=None)

    assert output_paths["intensity_offset"] == tmp_path / "slide_ch001_timeseries_intensity_offset.png"
    assert output_paths["protein_decay_rate"] == tmp_path / "slide_ch001_timeseries_protein_decay_rate.png"
    assert output_paths["mrna_decay_rate"] == tmp_path / "slide_ch001_timeseries_mrna_decay_rate.png"
    assert output_paths["expression_onset"] == tmp_path / "slide_ch001_timeseries_expression_onset.png"
    assert output_paths["expression_slope"] == tmp_path / "slide_ch001_timeseries_expression_slope.png"


def test_default_trace_plot_path_strips_fit_suffix(tmp_path: Path) -> None:
    fit_csv = tmp_path / "slide_ch001_timeseries_fit.csv"

    output_path = plot_fit.default_trace_plot_path(fit_csv, output_dir=None)

    assert output_path == tmp_path / "slide_ch001_timeseries_fit_traces.png"


def test_load_fit_csv_requires_semantic_columns(tmp_path: Path) -> None:
    fit_csv = tmp_path / "bad_fit.csv"
    fit_csv.write_text("slide_channel,pos,roi,success\n0,1,2,true\n", encoding="utf-8")

    with pytest.raises(ValueError, match="missing required columns"):
        plot_fit.load_fit_csv(fit_csv)


def test_infer_timeseries_csvs_matches_shared_stem(tmp_path: Path) -> None:
    fit_csv = tmp_path / "slide_ch001_timeseries_fit.csv"
    matching_a = tmp_path / "slide_sc0_ch001_timeseries.csv"
    matching_b = tmp_path / "slide_sc2_ch001_timeseries.csv"
    non_matching = tmp_path / "slide_sc0_ch002_timeseries.csv"
    for path in (matching_a, matching_b, non_matching):
        path.write_text("pos,roi,t,corrected\n", encoding="utf-8")

    resolved = plot_fit.infer_timeseries_csvs(fit_csv)

    assert resolved == [matching_a.resolve(), matching_b.resolve()]


def test_infer_timeseries_csvs_matches_mixed_channel_fit_stem(tmp_path: Path) -> None:
    fit_csv = tmp_path / "slide_timeseries_fit.csv"
    matching_a = tmp_path / "slide_sc0_ch001_timeseries.csv"
    matching_b = tmp_path / "slide_sc2_ch002_timeseries.csv"
    non_matching = tmp_path / "other_sc0_ch001_timeseries.csv"
    for path in (matching_a, matching_b, non_matching):
        path.write_text("pos,roi,t,corrected\n", encoding="utf-8")

    resolved = plot_fit.infer_timeseries_csvs(fit_csv)

    assert resolved == [matching_a.resolve(), matching_b.resolve()]


def test_cli_writes_boxplots_and_fitted_trace_overlay(tmp_path: Path) -> None:
    fit_csv = tmp_path / "slide_ch001_timeseries_fit.csv"
    write_fit_csv(fit_csv)
    write_timeseries_csv(tmp_path / "slide_sc0_ch001_timeseries.csv")
    write_timeseries_csv(tmp_path / "slide_sc1_ch001_timeseries.csv")

    plot_fit.cli(
        fit_csv=fit_csv,
        output_dir=None,
        interval=1.0,
        color="#c03a2b",
        columns=3,
        alpha=0.12,
        linewidth=1.0,
    )

    output_paths = plot_fit.default_output_plot_paths(fit_csv, output_dir=None)
    for output_path in output_paths.values():
        assert output_path.is_file()
    assert plot_fit.default_trace_plot_path(fit_csv, output_dir=None).is_file()


def test_write_fit_boxplot_uses_linear_ylim_for_non_log_parameter(tmp_path: Path) -> None:
    fit_csv = tmp_path / "slide_ch001_timeseries_fit.csv"
    write_fit_csv(fit_csv)
    df = plot_fit.load_fit_csv(fit_csv)
    output_plot = tmp_path / "protein_decay_rate.png"

    captured: dict[str, object] = {}
    original_subplots = plt.subplots

    def wrapped_subplots(*args, **kwargs):
        fig, ax = original_subplots(*args, **kwargs)
        captured["ax"] = ax
        return fig, ax

    plt.subplots = wrapped_subplots
    try:
        plot_fit.write_fit_boxplot(
            df,
            parameter="protein_decay_rate",
            ylabel="protein decay rate",
            output_plot=output_plot,
            color="#c03a2b",
            title=None,
        )
    finally:
        plt.subplots = original_subplots

    ax = captured["ax"]
    expected_upper = max(
        df.loc[df["slide_channel"] == 0, "protein_decay_rate"].quantile(0.75),
        df.loc[df["slide_channel"] == 1, "protein_decay_rate"].quantile(0.75),
    ) * 1.25
    assert ax.get_yscale() == "linear"
    assert ax.get_ylim()[0] == 0.0
    assert ax.get_ylim()[1] == pytest.approx(expected_upper)


def test_write_fit_boxplot_uses_log_ylim_for_expression_slope(tmp_path: Path) -> None:
    fit_csv = tmp_path / "slide_ch001_timeseries_fit.csv"
    write_fit_csv(fit_csv)
    df = plot_fit.load_fit_csv(fit_csv)
    output_plot = tmp_path / "expression_slope.png"

    captured: dict[str, object] = {}
    original_subplots = plt.subplots

    def wrapped_subplots(*args, **kwargs):
        fig, ax = original_subplots(*args, **kwargs)
        captured["ax"] = ax
        return fig, ax

    plt.subplots = wrapped_subplots
    try:
        plot_fit.write_fit_boxplot(
            df,
            parameter="expression_slope",
            ylabel="expression slope",
            output_plot=output_plot,
            color="#c03a2b",
            title=None,
        )
    finally:
        plt.subplots = original_subplots

    ax = captured["ax"]
    assert ax.get_yscale() == "log"
    assert ax.get_ylim()[0] > 0
    assert ax.get_ylim()[1] > ax.get_ylim()[0]
