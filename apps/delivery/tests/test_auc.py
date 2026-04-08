from __future__ import annotations

from pathlib import Path

import pandas as pd

from delivery.expression import auc


def write_timeseries_csv(csv_path: Path, rows: list[dict[str, float | int]]) -> None:
    pd.DataFrame(rows).to_csv(csv_path, index=False)


def test_default_output_csv_path_strips_slide_channel_segment(tmp_path: Path) -> None:
    csv_paths = [
        tmp_path / "slide_sc0_ch001_timeseries.csv",
        tmp_path / "slide_sc2_ch001_timeseries.csv",
    ]

    output_csv = auc.default_output_csv_path(csv_paths, output_csv=None)

    assert output_csv == (tmp_path / "slide_ch001_timeseries_auc.csv").resolve()


def test_compute_auc_table_integrates_by_pos_channel_roi(tmp_path: Path) -> None:
    csv_path = tmp_path / "slide_sc2_ch001_timeseries.csv"
    write_timeseries_csv(
        csv_path,
        [
            {"pos": 25, "channel": 1, "roi": 0, "t": 0, "corrected": 1.0},
            {"pos": 25, "channel": 1, "roi": 0, "t": 1, "corrected": 3.0},
            {"pos": 25, "channel": 1, "roi": 0, "t": 2, "corrected": 5.0},
            {"pos": 25, "channel": 1, "roi": 1, "t": 0, "corrected": 2.0},
            {"pos": 25, "channel": 1, "roi": 1, "t": 1, "corrected": 4.0},
        ],
    )

    auc_df = auc.compute_auc_table([csv_path], interval=10.0)

    assert auc_df.to_dict("records") == [
        {
            "source_csv": "slide_sc2_ch001_timeseries.csv",
            "slide_channel": 2,
            "pos": 25,
            "channel": 1,
            "roi": 0,
            "n_frames": 3,
            "interval_min": 10.0,
            "t_start": 0,
            "t_end": 2,
            "t_start_min": 0.0,
            "t_end_min": 20.0,
            "auc": 60.0,
        },
        {
            "source_csv": "slide_sc2_ch001_timeseries.csv",
            "slide_channel": 2,
            "pos": 25,
            "channel": 1,
            "roi": 1,
            "n_frames": 2,
            "interval_min": 10.0,
            "t_start": 0,
            "t_end": 1,
            "t_start_min": 0.0,
            "t_end_min": 10.0,
            "auc": 30.0,
        },
    ]


def test_cli_writes_auc_csv(tmp_path: Path) -> None:
    csv_path_a = tmp_path / "slide_sc0_ch001_timeseries.csv"
    csv_path_b = tmp_path / "slide_sc1_ch001_timeseries.csv"
    write_timeseries_csv(
        csv_path_a,
        [
            {"pos": 0, "channel": 1, "roi": 0, "t": 0, "corrected": 1.0},
            {"pos": 0, "channel": 1, "roi": 0, "t": 1, "corrected": 3.0},
        ],
    )
    write_timeseries_csv(
        csv_path_b,
        [
            {"pos": 12, "channel": 1, "roi": 0, "t": 0, "corrected": 2.0},
            {"pos": 12, "channel": 1, "roi": 0, "t": 1, "corrected": 2.0},
        ],
    )

    auc.cli(timeseries_csvs=[csv_path_b, csv_path_a], interval=10.0, output_csv=None)

    output_csv = tmp_path / "slide_ch001_timeseries_auc.csv"
    assert output_csv.is_file()
    output_df = pd.read_csv(output_csv)
    assert output_df["auc"].tolist() == [20.0, 20.0]
