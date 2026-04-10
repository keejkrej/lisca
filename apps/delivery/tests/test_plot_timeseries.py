from __future__ import annotations

from pathlib import Path

import pandas as pd

from delivery.expression import plot_timeseries


def write_timeseries_csv(csv_path: Path, *, roi_offset: int) -> None:
    pd.DataFrame(
        [
            {"roi": roi_offset, "t": 0, "corrected": 1.0},
            {"roi": roi_offset, "t": 1, "corrected": 2.0},
            {"roi": roi_offset + 1, "t": 0, "corrected": 1.5},
            {"roi": roi_offset + 1, "t": 1, "corrected": 2.5},
        ]
    ).to_csv(csv_path, index=False)


def test_default_output_plot_path_strips_slide_channel_segment(tmp_path: Path) -> None:
    csv_paths = [
        tmp_path / "slide_sc0_ch001_timeseries.csv",
        tmp_path / "slide_sc2_ch001_timeseries.csv",
    ]

    output_plot = plot_timeseries.default_output_plot_path(csv_paths, output_plot=None)

    assert output_plot == (tmp_path / "slide_ch001_timeseries_combined.png").resolve()


def test_cli_writes_combined_plot(tmp_path: Path) -> None:
    csv_path_a = tmp_path / "slide_sc0_ch001_timeseries.csv"
    csv_path_b = tmp_path / "slide_sc2_ch001_timeseries.csv"
    write_timeseries_csv(csv_path_a, roi_offset=0)
    write_timeseries_csv(csv_path_b, roi_offset=10)

    plot_timeseries.cli(
        timeseries_csvs=[csv_path_b, csv_path_a],
        output_plot=None,
        columns=2,
        alpha=0.12,
        linewidth=1.0,
        color="#c03a2b",
        title="Combined",
    )

    assert (tmp_path / "slide_ch001_timeseries_combined.png").is_file()


def test_trace_group_columns_include_position_when_present() -> None:
    df = pd.DataFrame(
        [
            {"pos": 0, "roi": 1, "t": 0, "corrected": 1.0},
            {"pos": 2, "roi": 1, "t": 0, "corrected": 3.0},
        ]
    )

    assert plot_timeseries.trace_group_columns(df) == ["pos", "roi"]


def test_trace_group_columns_fall_back_to_roi_without_position() -> None:
    df = pd.DataFrame(
        [
            {"roi": 1, "t": 0, "corrected": 1.0},
            {"roi": 2, "t": 0, "corrected": 3.0},
        ]
    )

    assert plot_timeseries.trace_group_columns(df) == ["roi"]


def test_subplot_title_includes_trace_count() -> None:
    csv_path = Path("/tmp/slide_sc3_ch001_timeseries.csv")

    assert plot_timeseries.subplot_title(csv_path, 42) == "slide channel 3 (42 traces)"
