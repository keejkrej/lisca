from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import matplotlib
import numpy as np
import pandas as pd
import typer

matplotlib.use("Agg")
import matplotlib.pyplot as plt


VALUE_COLUMN = "corrected"


@dataclass(frozen=True)
class SpikeDetectionResult:
    roi: int
    detected: bool
    spike_t: int | None
    spike_t_min: float | None
    spike_value: float | None
    baseline_t: int | None
    baseline_t_min: float | None
    baseline_value: float | None
    prominence: float | None
    threshold: float
    dynamic_range: float
    last_t: int
    last_t_min: float


app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=(
        "Detect the first stain-signal spike timing per ROI from a long-form "
        "timeseries CSV, write one-row-per-ROI results, and plot a histogram."
    ),
)


def load_timeseries(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    required = {"roi", "t", "t_min", VALUE_COLUMN}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(
            f"{csv_path} is missing required columns for spike detection: {sorted(missing)}"
        )
    return df.sort_values(["roi", "t"]).reset_index(drop=True)


def rolling_median(values: pd.Series, window: int) -> np.ndarray:
    if window < 1:
        raise ValueError(f"--smooth-window must be >= 1, got {window}")
    return (
        values.rolling(window=window, center=True, min_periods=1)
        .median()
        .to_numpy(dtype=float)
    )


def first_sustained_crossing(mask: np.ndarray, hold_frames: int) -> int | None:
    if hold_frames < 1:
        raise ValueError(f"--hold-frames must be >= 1, got {hold_frames}")
    if mask.size < hold_frames:
        return None
    run_length = 0
    for idx, is_active in enumerate(mask):
        run_length = run_length + 1 if is_active else 0
        if run_length >= hold_frames:
            return idx - hold_frames + 1
    return None


def detect_first_spike(
    roi_df: pd.DataFrame,
    *,
    smooth_window: int,
    min_prominence_fraction: float,
    min_prominence_abs: float,
    hold_frames: int,
) -> SpikeDetectionResult:
    roi_df = roi_df.sort_values("t").reset_index(drop=True)
    roi = int(roi_df["roi"].iat[0])
    smoothed = rolling_median(roi_df[VALUE_COLUMN], smooth_window)
    running_min = np.minimum.accumulate(smoothed)
    running_min_idx = np.empty(smoothed.size, dtype=int)
    current_min_idx = 0
    current_min_value = smoothed[0]
    for idx, value in enumerate(smoothed):
        if value < current_min_value:
            current_min_value = value
            current_min_idx = idx
        running_min_idx[idx] = current_min_idx

    dynamic_range = float(smoothed.max() - running_min.min())
    threshold = max(min_prominence_abs, min_prominence_fraction * dynamic_range)
    prominence = smoothed - running_min
    slope = np.diff(smoothed, prepend=smoothed[0])
    active = (prominence >= threshold) & (slope > 0)
    spike_idx = first_sustained_crossing(active, hold_frames)

    if spike_idx is None:
        return SpikeDetectionResult(
            roi=roi,
            detected=False,
            spike_t=None,
            spike_t_min=None,
            spike_value=None,
            baseline_t=None,
            baseline_t_min=None,
            baseline_value=None,
            prominence=None,
            threshold=float(threshold),
            dynamic_range=dynamic_range,
            last_t=int(roi_df["t"].iat[-1]),
            last_t_min=float(roi_df["t_min"].iat[-1]),
        )

    baseline_idx = int(running_min_idx[spike_idx])
    return SpikeDetectionResult(
        roi=roi,
        detected=True,
        spike_t=int(roi_df["t"].iat[spike_idx]),
        spike_t_min=float(roi_df["t_min"].iat[spike_idx]),
        spike_value=float(smoothed[spike_idx]),
        baseline_t=int(roi_df["t"].iat[baseline_idx]),
        baseline_t_min=float(roi_df["t_min"].iat[baseline_idx]),
        baseline_value=float(smoothed[baseline_idx]),
        prominence=float(prominence[spike_idx]),
        threshold=float(threshold),
        dynamic_range=dynamic_range,
        last_t=int(roi_df["t"].iat[-1]),
        last_t_min=float(roi_df["t_min"].iat[-1]),
    )


def detect_spikes(
    df: pd.DataFrame,
    *,
    smooth_window: int,
    min_prominence_fraction: float,
    min_prominence_abs: float,
    hold_frames: int,
) -> pd.DataFrame:
    rows = [
        detect_first_spike(
            roi_df,
            smooth_window=smooth_window,
            min_prominence_fraction=min_prominence_fraction,
            min_prominence_abs=min_prominence_abs,
            hold_frames=hold_frames,
        ).__dict__
        for _, roi_df in df.groupby("roi", sort=True)
    ]
    return pd.DataFrame(rows).sort_values("roi").reset_index(drop=True)


def default_output_csv_path(timeseries_csv: Path, output_csv: Path | None) -> Path:
    csv_path = output_csv or timeseries_csv.with_name(f"{timeseries_csv.stem}_spikes.csv")
    return csv_path.resolve()


def default_histogram_path(timeseries_csv: Path, output_plot: Path | None) -> Path:
    plot_path = output_plot or timeseries_csv.with_name(f"{timeseries_csv.stem}_spike_hist.png")
    return plot_path.resolve()


def write_results_csv(df: pd.DataFrame, output_csv: Path) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_csv, index=False)


def write_histogram(
    spikes_df: pd.DataFrame,
    output_plot: Path,
    *,
    bins: int,
    color: str,
    alpha: float,
    accumulate_undetected_at_end: bool,
    title: str | None,
) -> None:
    detected = spikes_df.loc[spikes_df["detected"], "spike_t_min"].dropna().astype(float)
    undetected = spikes_df.loc[~spikes_df["detected"].astype(bool)].copy()
    if detected.empty and (not accumulate_undetected_at_end or undetected.empty):
        raise ValueError("No detected spikes available to plot")

    histogram_values = detected.to_numpy()
    if accumulate_undetected_at_end and not undetected.empty:
        end_times = undetected["last_t_min"].dropna().astype(float).to_numpy()
        histogram_values = np.concatenate([histogram_values, end_times])

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.hist(histogram_values, bins=bins, color=color, alpha=alpha, edgecolor="none")
    ax.set_xlabel("first spike time (min)")
    ax.set_ylabel("ROI count")
    ax.grid(alpha=0.2, linewidth=0.5)
    if title is not None:
        ax.set_title(title)
    n_detected = int(spikes_df["detected"].astype(bool).sum())
    n_total = int(len(spikes_df))
    n_undetected = n_total - n_detected
    annotation = f"Detected: {n_detected}/{n_total}"
    if accumulate_undetected_at_end:
        annotation += f"\nNo spike by end: {n_undetected}"
    ax.text(
        0.98,
        0.98,
        annotation,
        transform=ax.transAxes,
        ha="right",
        va="top",
        bbox={"boxstyle": "round,pad=0.3", "facecolor": "white", "alpha": 0.85, "edgecolor": "none"},
    )

    output_plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_plot, dpi=150, bbox_inches="tight")
    plt.close(fig)


@app.command()
def cli(
    timeseries_csv: Path = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="Long-form ROI timeseries CSV generated by apoptosis stain roi-timeseries.",
    ),
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help="Output CSV path. Default: <timeseries_stem>_spikes.csv",
    ),
    output_plot: Path | None = typer.Option(
        None,
        "--output-plot",
        help="Histogram PNG path. Default: <timeseries_stem>_spike_hist.png",
    ),
    smooth_window: int = typer.Option(
        5,
        "--smooth-window",
        min=1,
        help="Centered rolling-median window in frames before spike detection.",
    ),
    min_prominence_fraction: float = typer.Option(
        0.30,
        "--min-prominence-fraction",
        min=0.0,
        max=1.0,
        help="Minimum prominence as a fraction of the ROI dynamic range.",
    ),
    min_prominence_abs: float = typer.Option(
        0.0,
        "--min-prominence-abs",
        min=0.0,
        help="Optional absolute prominence floor in corrected-intensity units.",
    ),
    hold_frames: int = typer.Option(
        1,
        "--hold-frames",
        min=1,
        help="Require the spike condition to hold for this many consecutive frames.",
    ),
    bins: int = typer.Option(
        20,
        "--bins",
        min=1,
        help="Number of histogram bins.",
    ),
    color: str = typer.Option(
        "#c03a2b",
        "--color",
        help="Histogram bar color.",
    ),
    alpha: float = typer.Option(
        0.8,
        "--alpha",
        min=0.0,
        max=1.0,
        help="Histogram bar opacity.",
    ),
    accumulate_undetected_at_end: bool = typer.Option(
        True,
        "--accumulate-undetected-at-end/--no-accumulate-undetected-at-end",
        help="Add undetected ROIs to the histogram at the last recorded timepoint.",
    ),
    title: str | None = typer.Option(
        "First stain-signal spike timings",
        "--title",
        help="Optional histogram title.",
    ),
) -> None:
    timeseries_csv = timeseries_csv.resolve()
    df = load_timeseries(timeseries_csv)
    spikes_df = detect_spikes(
        df,
        smooth_window=smooth_window,
        min_prominence_fraction=min_prominence_fraction,
        min_prominence_abs=min_prominence_abs,
        hold_frames=hold_frames,
    )
    resolved_output_csv = default_output_csv_path(timeseries_csv, output_csv)
    resolved_output_plot = default_histogram_path(timeseries_csv, output_plot)

    write_results_csv(spikes_df, resolved_output_csv)
    write_histogram(
        spikes_df,
        resolved_output_plot,
        bins=bins,
        color=color,
        alpha=alpha,
        accumulate_undetected_at_end=accumulate_undetected_at_end,
        title=title,
    )

    n_detected = int(spikes_df["detected"].sum())
    print(f"Wrote spike CSV: {resolved_output_csv}")
    print(f"Wrote histogram: {resolved_output_plot}")
    print(f"Detected first spikes for {n_detected}/{len(spikes_df)} ROIs")


def main(argv: list[str] | None = None, *, prog_name: str = "apoptosis stain detect-spikes") -> None:
    app(args=argv, prog_name=prog_name)
