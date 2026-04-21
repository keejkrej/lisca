from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import typer

from lisca.analysis.roi import load_timeseries_csv

from . import auc, plot_auc, plot_timeseries

PLOTTED_PARAMETERS = (
    ("intensity_offset", "intensity offset"),
    ("protein_decay_rate", "protein decay rate"),
    ("mrna_decay_rate", "mRNA decay rate"),
    ("expression_onset", "expression onset"),
    ("expression_amplitude", "expression amplitude"),
)

HELP = (
    "Plot fit summaries as one box plot per slide channel for each semantic fit parameter, "
    "and render fitted trace grids from the sibling timeseries CSVs."
)

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=HELP,
)


def run_plot_fit(
    fit_csv: Path,
    *,
    output_dir: Path | None,
    color: str,
    interval: float,
    columns: int,
    alpha: float,
    linewidth: float,
) -> list[Path]:
    resolved_fit_csv = fit_csv.resolve()
    df = load_fit_csv(resolved_fit_csv)
    output_paths = default_output_plot_paths(resolved_fit_csv, output_dir)
    written_paths: list[Path] = []
    for parameter, label in PLOTTED_PARAMETERS:
        write_fit_boxplot(
            df,
            parameter=parameter,
            ylabel=label,
            output_plot=output_paths[parameter],
            color=color,
            title=f"{label} by slide channel",
        )
        written_paths.append(output_paths[parameter])
    resolved_timeseries_csvs = infer_timeseries_csvs(resolved_fit_csv)
    fit_trace_plot = default_trace_plot_path(resolved_fit_csv, output_dir)
    write_fitted_trace_grid(
        df,
        resolved_timeseries_csvs,
        fit_trace_plot,
        interval=interval,
        columns=columns,
        alpha=alpha,
        linewidth=linewidth,
        color=color,
    )
    written_paths.append(fit_trace_plot)
    return written_paths


def load_fit_csv(fit_csv: Path) -> pd.DataFrame:
    df = pd.read_csv(fit_csv)
    required = {"slide_channel", "pos", "roi", "success", *(parameter for parameter, _ in PLOTTED_PARAMETERS)}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"{fit_csv} is missing required columns for fit plotting: {sorted(missing)}")

    keep_columns = ["slide_channel", "pos", "roi", "success", *(parameter for parameter, _ in PLOTTED_PARAMETERS)]
    df = df.loc[:, keep_columns].copy()
    df = df.dropna(subset=["slide_channel"])
    if df.empty:
        raise ValueError(f"{fit_csv} has no fit rows with slide_channel values")

    df["slide_channel"] = df["slide_channel"].astype(int)
    df["pos"] = pd.to_numeric(df["pos"], errors="coerce").astype("Int64")
    df["roi"] = pd.to_numeric(df["roi"], errors="coerce").astype("Int64")
    df["success"] = df["success"].astype(str).str.lower().eq("true")
    for parameter, _ in PLOTTED_PARAMETERS:
        df[parameter] = pd.to_numeric(df[parameter], errors="coerce")
    return df.sort_values(["slide_channel", "pos", "roi"]).reset_index(drop=True)


def default_output_plot_paths(fit_csv: Path, output_dir: Path | None) -> dict[str, Path]:
    destination_dir = fit_csv.parent if output_dir is None else output_dir.resolve()
    stem = fit_csv.stem.removesuffix("_fit")
    return {
        parameter: destination_dir / f"{stem}_{parameter}.png"
        for parameter, _ in PLOTTED_PARAMETERS
    }


def default_trace_plot_path(fit_csv: Path, output_dir: Path | None) -> Path:
    destination_dir = fit_csv.parent if output_dir is None else output_dir.resolve()
    stem = fit_csv.stem.removesuffix("_fit")
    return destination_dir / f"{stem}_fit_traces.png"


def infer_timeseries_csvs(fit_csv: Path) -> list[Path]:
    fit_stem = fit_csv.stem.removesuffix("_fit")
    matches = sorted(
        (
            candidate.resolve()
            for candidate in fit_csv.parent.glob("*_timeseries.csv")
            if plot_timeseries.normalize_output_stem(candidate) == fit_stem
        ),
        key=lambda path: path.name,
    )
    if not matches:
        raise ValueError(f"Could not infer sibling timeseries CSVs for {fit_csv}")
    return matches


def write_fit_boxplot(
    df: pd.DataFrame,
    *,
    parameter: str,
    ylabel: str,
    output_plot: Path,
    color: str,
    title: str | None,
) -> None:
    parameter_df = df.dropna(subset=[parameter]).copy()
    if parameter_df.empty:
        raise ValueError(f"No finite rows available to plot parameter {parameter!r}")

    slide_channels = sorted(parameter_df["slide_channel"].unique().tolist())
    trace_counts = [
        int(parameter_df.loc[parameter_df["slide_channel"] == slide_channel, parameter].shape[0])
        for slide_channel in slide_channels
    ]
    grouped_values = [
        parameter_df.loc[parameter_df["slide_channel"] == slide_channel, parameter].to_numpy(dtype=float)
        for slide_channel in slide_channels
    ]
    upper_limit = plot_auc.quartile_axis_upper(grouped_values)

    fig, ax = plt.subplots(figsize=(10, 6))
    boxplot = ax.boxplot(
        grouped_values,
        patch_artist=True,
        showfliers=False,
        tick_labels=[
            f"{slide_channel}\n(n={trace_count})"
            for slide_channel, trace_count in zip(slide_channels, trace_counts, strict=True)
        ],
        medianprops={"color": "black", "linewidth": 1.2},
    )
    for patch in boxplot["boxes"]:
        patch.set_facecolor(color)
        patch.set_alpha(0.65)

    ax.set_xlabel("slide channel")
    ax.set_ylabel(ylabel)
    ax.set_ylim(0.0, upper_limit)
    ax.grid(axis="y", alpha=0.2, linewidth=0.5)
    if title is not None:
        ax.set_title(title)

    output_plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_plot, dpi=150, bbox_inches="tight")
    plt.close(fig)


def fitted_trace_values(times_minutes: np.ndarray, fit_row: pd.Series) -> np.ndarray:
    intensity_offset = float(fit_row["intensity_offset"])
    protein_decay_rate = float(fit_row["protein_decay_rate"])
    mrna_decay_rate = float(fit_row["mrna_decay_rate"])
    expression_onset = float(fit_row["expression_onset"])
    expression_amplitude = float(fit_row["expression_amplitude"])
    dt = np.maximum(times_minutes - expression_onset, 0.0)
    predicted = intensity_offset + expression_amplitude * (
        np.exp(-protein_decay_rate * dt) - np.exp(-mrna_decay_rate * dt)
    )
    predicted[times_minutes < expression_onset] = intensity_offset
    return predicted


def write_fitted_trace_grid(
    fit_df: pd.DataFrame,
    timeseries_csvs: list[Path],
    output_plot: Path,
    *,
    interval: float,
    columns: int,
    alpha: float,
    linewidth: float,
    color: str,
) -> None:
    rows = math.ceil(len(timeseries_csvs) / columns)
    fig, axes = plt.subplots(rows, columns, figsize=(6.0 * columns, 4.8 * rows), squeeze=False)
    axes_flat = axes.flatten()
    fit_lookup = (
        fit_df.loc[fit_df["success"]]
        .set_index(["slide_channel", "pos", "roi"], drop=False)
        .sort_index()
    )
    plotted_trace_count = 0

    for ax, csv_path in zip(axes_flat, timeseries_csvs):
        df = load_timeseries_csv(csv_path)
        slide_channel = auc.parse_slide_channel(csv_path)
        matched_traces = 0
        trace_groups = df.groupby(plot_timeseries.trace_group_columns(df), sort=True, dropna=False)
        for group_key, trace_df in trace_groups:
            if not isinstance(group_key, tuple):
                group_key = (group_key,)
            group_values = dict(zip(plot_timeseries.trace_group_columns(df), group_key, strict=True))
            pos = int(group_values.get("pos", 0))
            roi = int(group_values["roi"])
            lookup_key = (slide_channel, pos, roi)
            if lookup_key not in fit_lookup.index:
                continue

            fit_row = fit_lookup.loc[lookup_key]
            times_minutes = trace_df["t"].astype(float).to_numpy(dtype=float) * interval
            predicted = fitted_trace_values(times_minutes, fit_row)
            ax.plot(
                times_minutes,
                predicted,
                color=color,
                alpha=alpha,
                linewidth=linewidth,
            )
            matched_traces += 1
            plotted_trace_count += 1

        ax.set_title(plot_timeseries.subplot_title(csv_path, matched_traces))
        ax.set_xlabel("minutes")
        ax.set_ylabel("corrected intensity")

    for ax in axes_flat[len(timeseries_csvs):]:
        ax.axis("off")

    if plotted_trace_count == 0:
        plt.close(fig)
        raise ValueError("No successful fit rows matched the inferred timeseries CSVs")

    fig.suptitle("Fitted traces by slide channel")
    fig.tight_layout(rect=(0.0, 0.0, 1.0, 0.97))
    output_plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_plot, dpi=150, bbox_inches="tight")
    plt.close(fig)


def format_written_fit_plot_messages(output_plots: list[Path]) -> list[str]:
    return [f"Wrote plot: {output_plot}" for output_plot in output_plots]


@app.command()
def cli(
    fit_csv: Path = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="Fit summary CSV generated by delivery expression fit.",
    ),
    output_dir: Path | None = typer.Option(
        None,
        "--output-dir",
        help="Directory for output PNGs. Default: same directory as the fit CSV.",
    ),
    interval: float = typer.Option(
        ...,
        "--interval",
        min=0.0,
        help="Frame interval in minutes used to reconstruct fitted traces against the sibling timeseries CSVs.",
    ),
    color: str = typer.Option(
        "#c03a2b",
        "--color",
        help="Matplotlib color for fitted curves and box fills.",
    ),
    columns: int = typer.Option(
        3,
        "--columns",
        min=1,
        help="Number of subplot columns in the fitted-trace grid.",
    ),
    alpha: float = typer.Option(
        0.12,
        "--alpha",
        min=0.0,
        max=1.0,
        help="Per-trace opacity for fitted traces in the fitted-trace grid.",
    ),
    linewidth: float = typer.Option(
        1.0,
        "--linewidth",
        min=0.1,
        help="Per-trace line width for fitted traces in the fitted-trace grid.",
    ),
) -> None:
    output_plots = run_plot_fit(
        fit_csv,
        output_dir=output_dir,
        color=color,
        interval=interval,
        columns=columns,
        alpha=alpha,
        linewidth=linewidth,
    )
    for message in format_written_fit_plot_messages(output_plots):
        print(message)


def main(argv: list[str] | None = None, *, prog_name: str = "delivery expression plot-fit") -> None:
    app(args=argv, prog_name=prog_name)


if __name__ == "__main__":
    main()
