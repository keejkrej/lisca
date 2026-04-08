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
