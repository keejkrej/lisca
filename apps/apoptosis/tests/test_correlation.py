from __future__ import annotations

from pathlib import Path

import pandas as pd

from apoptosis import correlation


def test_build_correlation_table_joins_detected_events(tmp_path: Path) -> None:
    bf_csv = tmp_path / "bf_events.csv"
    stain_csv = tmp_path / "stain_spikes.csv"
    pd.DataFrame(
        [
            {"roi": 0, "detected": True, "event_t": 10},
            {"roi": 1, "detected": False, "event_t": ""},
            {"roi": 2, "detected": True, "event_t": 30},
        ]
    ).to_csv(bf_csv, index=False)
    pd.DataFrame(
        [
            {"roi": 0, "detected": True, "spike_t": 12},
            {"roi": 1, "detected": True, "spike_t": 22},
            {"roi": 2, "detected": True, "spike_t": 32},
        ]
    ).to_csv(stain_csv, index=False)

    df = correlation.build_correlation_table(bf_csv, stain_csv, interval=10.0)

    assert df.to_dict("records") == [
        {"roi": 0, "stain_frame": 12, "bf_frame": 10.0, "stain_timing_min": 120.0, "bf_timing_min": 100.0},
        {"roi": 2, "stain_frame": 32, "bf_frame": 30.0, "stain_timing_min": 320.0, "bf_timing_min": 300.0},
    ]


def test_correlation_main_writes_plot_and_joined_csv(tmp_path: Path) -> None:
    bf_csv = tmp_path / "bf_events.csv"
    stain_csv = tmp_path / "stain_spikes.csv"
    output_plot = tmp_path / "scatter.png"
    output_csv = tmp_path / "joined.csv"
    pd.DataFrame(
        [
            {"roi": 0, "detected": True, "event_t": 10},
            {"roi": 1, "detected": True, "event_t": 20},
        ]
    ).to_csv(bf_csv, index=False)
    pd.DataFrame(
        [
            {"roi": 0, "detected": True, "spike_t": 11},
            {"roi": 1, "detected": True, "spike_t": 21},
        ]
    ).to_csv(stain_csv, index=False)

    correlation.main(
        [
            str(bf_csv),
            str(stain_csv),
            "--output-plot",
            str(output_plot),
            "--output-csv",
            str(output_csv),
            "--interval",
            "10",
        ]
    )

    assert output_plot.is_file()
    assert output_plot.stat().st_size > 0
    assert pd.read_csv(output_csv).to_dict("records") == [
        {"roi": 0, "stain_frame": 11, "bf_frame": 10, "stain_timing_min": 110.0, "bf_timing_min": 100.0},
        {"roi": 1, "stain_frame": 21, "bf_frame": 20, "stain_timing_min": 210.0, "bf_timing_min": 200.0},
    ]
