from __future__ import annotations

import csv
import math
from pathlib import Path

import pandas as pd
import pytest

from delivery.expression import fit


def write_timeseries_csv(csv_path: Path, rows: list[dict[str, float | int]]) -> None:
    pd.DataFrame(rows).to_csv(csv_path, index=False)


def test_default_output_csv_path_strips_slide_channel_segment(tmp_path: Path) -> None:
    csv_paths = [
        tmp_path / "slide_sc0_ch001_timeseries.csv",
        tmp_path / "slide_sc2_ch001_timeseries.csv",
    ]

    output_csv = fit.default_output_csv_path(csv_paths, output_csv=None)

    assert output_csv == (tmp_path / "slide_ch001_timeseries_fit.csv").resolve()


def test_compute_fit_table_recovers_plateau_and_direct_rise_traces(tmp_path: Path) -> None:
    csv_path = tmp_path / "slide_sc2_ch001_timeseries.csv"
    interval = 2.5
    frames = list(range(8))
    onset_frame = 2
    rows = [
        {
            "pos": 25,
            "roi": 0,
            "t": frame,
            "corrected": (
                2.0
                if frame < onset_frame
                else 2.0 + 8.0 * (1.0 - math.exp(-0.3 * ((frame - onset_frame) * interval)))
            ),
        }
        for frame in frames
    ] + [
        {
            "pos": 25,
            "roi": 1,
            "t": frame,
            "corrected": 3.5 + 2.0 * (1.0 - math.exp(-0.4 * (frame * interval))),
        }
        for frame in frames
    ]
    write_timeseries_csv(csv_path, rows)

    fit_df = fit.compute_fit_table([csv_path], interval=interval)

    assert fit_df.columns.tolist() == [
        "slide_channel",
        "pos",
        "roi",
        "d",
        "b",
        "t_onset",
        "amplitude",
        "c",
        "intensity_offset",
        "mrna_decay_rate",
        "expression_onset",
        "expression_amplitude",
        "success",
    ]
    records = fit_df.to_dict("records")
    assert records[0]["slide_channel"] == 2
    assert records[0]["pos"] == 25
    assert records[0]["roi"] == 0
    assert records[0]["success"] is True
    assert records[0]["d"] == pytest.approx(2.0, rel=0.03, abs=0.05)
    assert records[0]["b"] == pytest.approx(0.3, rel=0.03, abs=0.02)
    assert records[0]["t_onset"] == pytest.approx(onset_frame * interval, abs=1e-8)
    assert records[0]["amplitude"] == pytest.approx(8.0, rel=0.04, abs=0.08)
    assert records[0]["c"] == pytest.approx(10.0, rel=0.01, abs=0.05)
    assert records[0]["intensity_offset"] == pytest.approx(2.0, rel=0.03, abs=0.05)
    assert records[0]["mrna_decay_rate"] == pytest.approx(0.3, rel=0.03, abs=0.02)
    assert records[0]["expression_onset"] == pytest.approx(onset_frame * interval, abs=1e-8)
    assert records[0]["expression_amplitude"] == pytest.approx(8.0, rel=0.04, abs=0.08)

    assert records[1]["success"] is True
    assert records[1]["d"] == pytest.approx(3.5, rel=0.03, abs=0.05)
    assert records[1]["b"] == pytest.approx(0.4, rel=0.03, abs=0.02)
    assert records[1]["t_onset"] == pytest.approx(0.0, abs=1e-8)
    assert records[1]["amplitude"] == pytest.approx(2.0, rel=0.03, abs=0.05)
    assert records[1]["c"] == pytest.approx(5.5, rel=0.01, abs=0.05)
    assert records[1]["intensity_offset"] == pytest.approx(3.5, rel=0.03, abs=0.05)
    assert records[1]["mrna_decay_rate"] == pytest.approx(0.4, rel=0.03, abs=0.02)
    assert records[1]["expression_onset"] == pytest.approx(0.0, abs=1e-8)
    assert records[1]["expression_amplitude"] == pytest.approx(2.0, rel=0.03, abs=0.05)


def test_compute_fit_table_marks_failed_traces(tmp_path: Path) -> None:
    csv_path = tmp_path / "slide_sc0_ch001_timeseries.csv"
    write_timeseries_csv(
        csv_path,
        [
            {"pos": 0, "roi": 0, "t": 0, "corrected": 1.0},
            {"pos": 0, "roi": 0, "t": 1, "corrected": 1.0},
            {"pos": 0, "roi": 1, "t": 0, "corrected": 2.0},
            {"pos": 0, "roi": 1, "t": 1, "corrected": 3.0},
        ],
    )

    fit_df = fit.compute_fit_table([csv_path], interval=5.0)

    records = fit_df.to_dict("records")
    assert records[0]["slide_channel"] == 0
    assert records[0]["pos"] == 0
    assert records[0]["roi"] == 0
    assert pd.isna(records[0]["d"])
    assert pd.isna(records[0]["b"])
    assert pd.isna(records[0]["t_onset"])
    assert pd.isna(records[0]["amplitude"])
    assert pd.isna(records[0]["c"])
    assert pd.isna(records[0]["intensity_offset"])
    assert pd.isna(records[0]["mrna_decay_rate"])
    assert pd.isna(records[0]["expression_onset"])
    assert pd.isna(records[0]["expression_amplitude"])
    assert records[0]["success"] is False
    assert records[1]["slide_channel"] == 0
    assert records[1]["pos"] == 0
    assert records[1]["roi"] == 1
    assert pd.isna(records[1]["d"])
    assert pd.isna(records[1]["b"])
    assert pd.isna(records[1]["t_onset"])
    assert pd.isna(records[1]["amplitude"])
    assert pd.isna(records[1]["c"])
    assert pd.isna(records[1]["intensity_offset"])
    assert pd.isna(records[1]["mrna_decay_rate"])
    assert pd.isna(records[1]["expression_onset"])
    assert pd.isna(records[1]["expression_amplitude"])
    assert records[1]["success"] is False


def test_cli_writes_fit_csv_with_expected_columns(tmp_path: Path) -> None:
    csv_path = tmp_path / "slide_sc0_ch001_timeseries.csv"
    interval = 1.5
    write_timeseries_csv(
        csv_path,
        [
            {
                "pos": 12,
                "roi": 0,
                "t": frame,
                "corrected": 3.5 + 2.0 * (1.0 - math.exp(-0.4 * (frame * interval))),
            }
            for frame in range(6)
        ],
    )

    fit.cli(timeseries_csvs=[csv_path], interval=interval, output_csv=None)

    output_csv = tmp_path / "slide_ch001_timeseries_fit.csv"
    assert output_csv.is_file()
    with output_csv.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert set(rows[0]) == {
        "slide_channel",
        "pos",
        "roi",
        "d",
        "b",
        "t_onset",
        "amplitude",
        "c",
        "intensity_offset",
        "mrna_decay_rate",
        "expression_onset",
        "expression_amplitude",
        "success",
    }
    assert list(rows[0]) == [
        "slide_channel",
        "pos",
        "roi",
        "d",
        "b",
        "t_onset",
        "amplitude",
        "c",
        "intensity_offset",
        "mrna_decay_rate",
        "expression_onset",
        "expression_amplitude",
        "success",
    ]
    assert rows[0]["slide_channel"] == "0"
    assert rows[0]["pos"] == "12"
    assert rows[0]["roi"] == "0"
    assert float(rows[0]["d"]) == pytest.approx(3.5, rel=0.03, abs=0.05)
    assert float(rows[0]["b"]) == pytest.approx(0.4, rel=0.03, abs=0.02)
    assert float(rows[0]["t_onset"]) == pytest.approx(0.0, abs=1e-8)
    assert float(rows[0]["amplitude"]) == pytest.approx(2.0, rel=0.03, abs=0.05)
    assert float(rows[0]["c"]) == pytest.approx(5.5, rel=0.01, abs=0.05)
    assert float(rows[0]["intensity_offset"]) == pytest.approx(3.5, rel=0.03, abs=0.05)
    assert float(rows[0]["mrna_decay_rate"]) == pytest.approx(0.4, rel=0.03, abs=0.02)
    assert float(rows[0]["expression_onset"]) == pytest.approx(0.0, abs=1e-8)
    assert float(rows[0]["expression_amplitude"]) == pytest.approx(2.0, rel=0.03, abs=0.05)
    assert rows[0]["success"] == "true"
