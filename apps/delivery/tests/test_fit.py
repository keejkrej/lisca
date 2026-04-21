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


def test_compute_fit_table_recovers_biexponential_traces_with_zero_onset(tmp_path: Path) -> None:
    csv_path = tmp_path / "slide_sc2_ch001_timeseries.csv"
    interval = 1.0
    frames = list(range(25))
    rows = [
        {
            "pos": 25,
            "roi": 0,
            "t": frame,
            "corrected": 2.0 + 40.0 * (math.exp(-0.05 * (frame * interval)) - math.exp(-0.35 * (frame * interval))),
        }
        for frame in frames
    ] + [
        {
            "pos": 25,
            "roi": 1,
            "t": frame,
            "corrected": 3.5 + 16.0 * (math.exp(-0.05 * (frame * interval)) - math.exp(-0.7 * (frame * interval))),
        }
        for frame in frames
    ]
    write_timeseries_csv(csv_path, rows)

    fit_df = fit.compute_fit_table([csv_path], interval=interval)

    assert fit_df.columns.tolist() == [
        "slide_channel",
        "pos",
        "roi",
        "intensity_offset",
        "protein_decay_rate",
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
    assert records[0]["intensity_offset"] == pytest.approx(2.0, rel=0.03, abs=0.08)
    assert records[0]["protein_decay_rate"] == pytest.approx(0.05, rel=0.18, abs=0.015)
    assert records[0]["mrna_decay_rate"] == pytest.approx(0.35, rel=0.15, abs=0.05)
    assert records[0]["expression_onset"] == pytest.approx(0.0, abs=1e-8)
    assert records[0]["expression_amplitude"] == pytest.approx(40.0, rel=0.1, abs=2.0)

    assert records[1]["success"] is True
    assert records[1]["intensity_offset"] == pytest.approx(3.5, rel=0.03, abs=0.08)
    assert records[1]["protein_decay_rate"] == pytest.approx(records[0]["protein_decay_rate"], abs=1e-12)
    assert records[1]["mrna_decay_rate"] == pytest.approx(0.7, rel=0.15, abs=0.08)
    assert records[1]["expression_onset"] == pytest.approx(0.0, abs=1e-8)
    assert records[1]["expression_amplitude"] == pytest.approx(16.0, rel=0.12, abs=1.0)


def test_compute_fit_table_respects_max_onset_minutes_in_second_pass(tmp_path: Path) -> None:
    csv_path = tmp_path / "slide_sc2_ch001_timeseries.csv"
    interval = 1.0
    onset_minutes = 5.0
    rows = [
        {
            "pos": 25,
            "roi": 0,
            "t": frame,
            "corrected": 2.0 + 40.0 * (math.exp(-0.05 * (frame * interval)) - math.exp(-0.35 * (frame * interval))),
        }
        for frame in range(25)
    ] + [
        {
            "pos": 25,
            "roi": 1,
            "t": frame,
            "corrected": (
                3.5
                if (frame * interval) < onset_minutes
                else 3.5
                + 16.0
                * (
                    math.exp(-0.05 * ((frame * interval) - onset_minutes))
                    - math.exp(-0.7 * ((frame * interval) - onset_minutes))
                )
            ),
        }
        for frame in range(25)
    ]
    write_timeseries_csv(csv_path, rows)

    unconstrained = fit.compute_fit_table([csv_path], interval=interval, max_onset_minutes=12.0)
    clamped = fit.compute_fit_table([csv_path], interval=interval, max_onset_minutes=4.0)

    delayed_unconstrained = unconstrained.to_dict("records")[1]
    delayed_clamped = clamped.to_dict("records")[1]
    assert delayed_unconstrained["expression_onset"] == pytest.approx(onset_minutes, abs=1e-8)
    assert delayed_clamped["expression_onset"] <= 4.0
    assert delayed_unconstrained["protein_decay_rate"] == pytest.approx(
        unconstrained.to_dict("records")[0]["protein_decay_rate"], abs=1e-12
    )
    assert delayed_unconstrained["success"] is True


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
    assert pd.isna(records[0]["intensity_offset"])
    assert pd.isna(records[0]["protein_decay_rate"])
    assert pd.isna(records[0]["mrna_decay_rate"])
    assert pd.isna(records[0]["expression_onset"])
    assert pd.isna(records[0]["expression_amplitude"])
    assert records[0]["success"] is False
    assert records[1]["slide_channel"] == 0
    assert records[1]["pos"] == 0
    assert records[1]["roi"] == 1
    assert pd.isna(records[1]["intensity_offset"])
    assert pd.isna(records[1]["protein_decay_rate"])
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
                "corrected": 3.5 + 16.0 * (math.exp(-0.05 * (frame * interval)) - math.exp(-0.7 * (frame * interval))),
            }
            for frame in range(25)
        ],
    )

    fit.cli(
        timeseries_csvs=[csv_path],
        interval=interval,
        output_csv=None,
        max_onset_minutes=None,
        jobs=1,
    )

    output_csv = tmp_path / "slide_ch001_timeseries_fit.csv"
    assert output_csv.is_file()
    with output_csv.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert set(rows[0]) == {
        "slide_channel",
        "pos",
        "roi",
        "intensity_offset",
        "protein_decay_rate",
        "mrna_decay_rate",
        "expression_onset",
        "expression_amplitude",
        "success",
    }
    assert list(rows[0]) == [
        "slide_channel",
        "pos",
        "roi",
        "intensity_offset",
        "protein_decay_rate",
        "mrna_decay_rate",
        "expression_onset",
        "expression_amplitude",
        "success",
    ]
    assert rows[0]["slide_channel"] == "0"
    assert rows[0]["pos"] == "12"
    assert rows[0]["roi"] == "0"
    assert float(rows[0]["intensity_offset"]) == pytest.approx(3.5, rel=0.03, abs=0.08)
    assert float(rows[0]["protein_decay_rate"]) == pytest.approx(0.05, rel=0.18, abs=0.015)
    assert float(rows[0]["mrna_decay_rate"]) == pytest.approx(0.7, rel=0.15, abs=0.08)
    assert float(rows[0]["expression_onset"]) == pytest.approx(0.0, abs=1e-8)
    assert float(rows[0]["expression_amplitude"]) == pytest.approx(16.0, rel=0.12, abs=1.0)
    assert rows[0]["success"] == "true"
