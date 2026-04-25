from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from lisca.analysis.roi import parse_quartiles, quantile_column_name
from lisca.data.bbox import RoiBox, clip_roi, read_bbox_csv
from lisca.data.nd2 import build_frame_lookup, read_frame_2d

from apoptosis.stain.nd2_roi_timeseries import (
    _FakeHandle,
    compute_metrics,
    default_output_csv_path,
)
from apoptosis.stain.detect_spikes import (
    default_histogram_path,
    default_output_csv_path as default_spike_output_csv_path,
    detect_spikes,
    load_timeseries as load_spike_timeseries,
    write_histogram,
)
from apoptosis.stain.plot_traces import (
    default_output_plot_path,
    load_spikes,
    load_timeseries,
    write_trace_plot,
)


def write_csv(path: Path, header: list[str], rows: list[list[int]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def test_read_bbox_csv_requires_roi_header(tmp_path: Path) -> None:
    csv_path = tmp_path / "bbox.csv"
    write_csv(csv_path, ["crop", "x", "y", "w", "h"], [[0, 1, 2, 3, 4]])

    with pytest.raises(ValueError, match="roi,x,y,w,h"):
        read_bbox_csv(csv_path)


def test_read_bbox_csv_parses_rows(tmp_path: Path) -> None:
    csv_path = tmp_path / "bbox.csv"
    write_csv(csv_path, ["roi", "x", "y", "w", "h"], [[7, 11, 13, 17, 19]])

    rois = read_bbox_csv(csv_path)

    assert rois == [RoiBox(roi=7, x=11, y=13, w=17, h=19)]


def test_parse_quartiles_rejects_duplicates() -> None:
    with pytest.raises(ValueError, match="unique"):
        parse_quartiles("0.25,0.25")


def test_quantile_column_name_requires_integer_percent() -> None:
    with pytest.raises(ValueError, match="integer percentage"):
        quantile_column_name(0.123)


def test_clip_roi_clips_to_frame() -> None:
    y_slice, x_slice, clipped_w, clipped_h = clip_roi(
        RoiBox(roi=1, x=-3, y=1, w=7, h=5),
        height=4,
        width=5,
    )

    assert (y_slice.start, y_slice.stop) == (1, 4)
    assert (x_slice.start, x_slice.stop) == (0, 4)
    assert (clipped_w, clipped_h) == (4, 3)


def test_read_frame_2d_extracts_in_pixel_channel() -> None:
    handle = _FakeHandle(
        sizes={"P": 1, "T": 1, "C": 2, "Z": 1, "Y": 2, "X": 3},
        loop_indices=({},),
        frames=[
            np.array(
                [
                    [[1, 2, 3], [4, 5, 6]],
                    [[10, 11, 12], [13, 14, 15]],
                ],
                dtype=np.uint16,
            )
        ],
    )

    lookup = build_frame_lookup(handle)
    frame = read_frame_2d(handle, lookup, 0, 0, 1, 0)

    np.testing.assert_array_equal(frame, np.array([[10, 11, 12], [13, 14, 15]], dtype=np.uint16))


def test_compute_metrics_returns_long_form_trace() -> None:
    handle = _FakeHandle(
        sizes={"P": 1, "T": 2, "C": 2, "Z": 1, "Y": 2, "X": 3},
        loop_indices=({"P": 0, "T": 0}, {"P": 0, "T": 1}),
        frames=[
            np.array(
                [
                    [[1, 2, 3], [4, 5, 6]],
                    [[10, 11, 12], [13, 14, 15]],
                ],
                dtype=np.uint16,
            ),
            np.array(
                [
                    [[7, 8, 9], [10, 11, 12]],
                    [[20, 21, 22], [23, 24, 25]],
                ],
                dtype=np.uint16,
            ),
        ],
        metadata_channels=["BF_TOTO_10x", "Cy5_10x"],
        relative_times_ms=[1000.0, 61000.0],
    )
    rois = [
        RoiBox(roi=0, x=0, y=0, w=2, h=2),
        RoiBox(roi=1, x=2, y=0, w=1, h=2),
    ]

    df = compute_metrics(
        handle,
        build_frame_lookup(handle),
        rois,
        pos=0,
        channel=1,
        quartiles=parse_quartiles("0.25,0.50"),
    )

    assert list(df.columns[:8]) == ["pos", "channel", "channel_name", "t", "t_ms", "t_min", "roi", "x"]
    assert len(df) == 4
    assert list(df["roi"]) == [0, 0, 1, 1]
    assert list(df["t"]) == [0, 1, 0, 1]
    assert df["channel_name"].unique().tolist() == ["Cy5_10x"]

    first = df.iloc[0]
    assert first["sum"] == 48
    assert first["area"] == 4
    assert first["q25"] == pytest.approx(10.75)
    assert first["q50"] == pytest.approx(12.0)
    assert first["corrected"] == pytest.approx(5.0)
    assert first["t_ms"] == pytest.approx(1000.0)
    assert first["t_min"] == pytest.approx(1.0 / 60.0)

    second_time = df.iloc[1]
    assert second_time["sum"] == 88
    assert second_time["q25"] == pytest.approx(20.75)
    assert second_time["corrected"] == pytest.approx(5.0)


def test_compute_metrics_requires_q25_for_corrected() -> None:
    handle = _FakeHandle(
        sizes={"P": 1, "T": 1, "C": 1, "Y": 2, "X": 2},
        loop_indices=({"P": 0, "T": 0},),
        frames=[np.array([[1, 2], [3, 4]], dtype=np.uint16)],
    )

    with pytest.raises(ValueError, match="include 0.25"):
        compute_metrics(
            handle,
            build_frame_lookup(handle),
            [RoiBox(roi=0, x=0, y=0, w=2, h=2)],
            pos=0,
            channel=0,
            quartiles=parse_quartiles("0.10,0.50"),
        )


def test_default_output_csv_path_uses_pos_and_channel(tmp_path: Path) -> None:
    path = default_output_csv_path(tmp_path / "Pos0.csv", pos=3, channel=1, output_csv=None)
    assert path.name == "Pos0_pos003_ch001_timeseries.csv"


def test_write_trace_plot_writes_png(tmp_path: Path) -> None:
    csv_path = tmp_path / "timeseries.csv"
    write_csv(
        csv_path,
        ["roi", "t", "corrected"],
        [
            [0, 0, 10],
            [0, 1, 12],
            [1, 0, 8],
            [1, 1, 15],
        ],
    )

    df = load_timeseries(csv_path)
    output_plot = default_output_plot_path(csv_path, None)
    write_trace_plot(
        df,
        output_plot,
        color="#000000",
        alpha=0.12,
        linewidth=1.0,
        spikes_df=None,
        spike_color="#0b5fff",
        spike_alpha=0.95,
        spike_marker_size=110.0,
        spike_marker_linewidth=2.2,
        title=None,
    )

    assert output_plot.is_file()
    assert output_plot.stat().st_size > 0


def test_write_trace_plot_with_spikes_writes_png(tmp_path: Path) -> None:
    csv_path = tmp_path / "timeseries.csv"
    spike_csv = tmp_path / "spikes.csv"
    write_csv(
        csv_path,
        ["roi", "t", "corrected"],
        [
            [0, 0, 10],
            [0, 1, 12],
            [1, 0, 8],
            [1, 1, 15],
        ],
    )
    write_csv(
        spike_csv,
        ["roi", "detected", "spike_t", "spike_value"],
        [
            [0, True, 1.0, 12.0],
            [1, False, "", ""],
        ],
    )

    df = load_timeseries(csv_path)
    spikes_df = load_spikes(spike_csv)
    output_plot = tmp_path / "overlay.png"
    write_trace_plot(
        df,
        output_plot,
        color="#000000",
        alpha=0.12,
        linewidth=1.0,
        spikes_df=spikes_df,
        spike_color="#0b5fff",
        spike_alpha=0.95,
        spike_marker_size=110.0,
        spike_marker_linewidth=2.2,
        title=None,
    )

    assert output_plot.is_file()
    assert output_plot.stat().st_size > 0


def test_detect_spikes_finds_first_crossing_after_baseline(tmp_path: Path) -> None:
    csv_path = tmp_path / "timeseries.csv"
    write_csv(
        csv_path,
        ["roi", "t", "t_min", "corrected"],
        [
            [0, 0, 0.0, 10.0],
            [0, 1, 1.0, 8.0],
            [0, 2, 2.0, 6.0],
            [0, 3, 3.0, 7.0],
            [0, 4, 4.0, 10.0],
            [0, 5, 5.0, 15.0],
            [1, 0, 0.0, 9.0],
            [1, 1, 1.0, 8.0],
            [1, 2, 2.0, 7.0],
            [1, 3, 3.0, 7.0],
            [1, 4, 4.0, 7.0],
            [1, 5, 5.0, 7.0],
        ],
    )

    spikes_df = detect_spikes(
        load_spike_timeseries(csv_path),
        smooth_window=1,
        min_prominence_fraction=0.5,
        min_prominence_abs=0.0,
        hold_frames=1,
    )

    roi0 = spikes_df.loc[spikes_df["roi"] == 0].iloc[0]
    assert bool(roi0["detected"])
    assert roi0["spike_t"] == 5
    assert roi0["baseline_t"] == 2
    assert roi0["baseline_value"] == pytest.approx(6.0)
    assert roi0["prominence"] == pytest.approx(9.0)
    assert roi0["threshold"] == pytest.approx(4.5)
    assert roi0["last_t"] == 5

    roi1 = spikes_df.loc[spikes_df["roi"] == 1].iloc[0]
    assert not bool(roi1["detected"])
    assert roi1["last_t"] == 5


def test_spike_outputs_and_histogram_paths(tmp_path: Path) -> None:
    timeseries_csv = tmp_path / "trace.csv"
    assert default_spike_output_csv_path(timeseries_csv, None).name == "trace_spikes.csv"
    assert default_histogram_path(timeseries_csv, None).name == "trace_spike_hist.png"


def test_write_histogram_writes_png(tmp_path: Path) -> None:
    spikes_df = pd.DataFrame(
        [
            {"roi": 0, "detected": True, "spike_t": 10, "last_t": 30},
            {"roi": 1, "detected": True, "spike_t": 20, "last_t": 30},
            {"roi": 2, "detected": False, "spike_t": np.nan, "last_t": 30},
        ]
    )
    output_plot = tmp_path / "hist.png"

    write_histogram(
        spikes_df,
        output_plot,
        bins=5,
        color="#000000",
        alpha=0.8,
        accumulate_undetected_at_end=True,
        title=None,
    )

    assert output_plot.is_file()
    assert output_plot.stat().st_size > 0
