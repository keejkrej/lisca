from __future__ import annotations

from pathlib import Path

import matplotlib
import numpy as np
import pandas as pd
import typer

matplotlib.use("Agg")
import matplotlib.pyplot as plt


app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help="Plot TOTO-3 event timing versus bright field event timing from existing result CSVs.",
)


def _as_bool_series(series: pd.Series) -> pd.Series:
    if series.dtype == bool:
        return series
    return series.astype(str).str.lower().isin({"true", "1", "yes"})


def choose_timing_column(df: pd.DataFrame, candidates: tuple[str, ...], *, label: str) -> str:
    for column in candidates:
        if column in df.columns and df[column].notna().any():
            return column
    available = ", ".join(df.columns)
    raise ValueError(f"No usable {label} timing column found. Available columns: {available}")


def load_bf_events(csv_path: Path, timing_column: str | None) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    required = {"roi", "detected"}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"{csv_path} is missing required BF event columns: {sorted(missing)}")

    column = timing_column or choose_timing_column(df, ("event_t",), label="BF")
    if column not in df.columns:
        raise ValueError(f"{csv_path} does not contain BF timing column {column!r}")

    output = df.loc[_as_bool_series(df["detected"]), ["roi", column]].copy()
    output = output.rename(columns={column: "bf_frame"})
    output["bf_frame"] = pd.to_numeric(output["bf_frame"], errors="coerce")
    return output.dropna(subset=["bf_frame"])


def load_stain_events(csv_path: Path, timing_column: str | None) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    required = {"roi", "detected"}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"{csv_path} is missing required stain event columns: {sorted(missing)}")

    column = timing_column or choose_timing_column(df, ("spike_t",), label="stain")
    if column not in df.columns:
        raise ValueError(f"{csv_path} does not contain stain timing column {column!r}")

    output = df.loc[_as_bool_series(df["detected"]), ["roi", column]].copy()
    output = output.rename(columns={column: "stain_frame"})
    output["stain_frame"] = pd.to_numeric(output["stain_frame"], errors="coerce")
    return output.dropna(subset=["stain_frame"])


def build_correlation_table(
    bf_events_csv: Path,
    stain_events_csv: Path,
    *,
    interval: float,
    bf_timing_column: str | None = None,
    stain_timing_column: str | None = None,
) -> pd.DataFrame:
    if interval <= 0:
        raise ValueError(f"--interval must be > 0, got {interval}")
    bf_df = load_bf_events(bf_events_csv, bf_timing_column)
    stain_df = load_stain_events(stain_events_csv, stain_timing_column)
    joined = stain_df.merge(bf_df, on="roi", how="inner").sort_values("roi").reset_index(drop=True)
    if joined.empty:
        raise ValueError("No ROIs have detected timings in both stain and BF event CSVs")
    joined["stain_timing_min"] = joined["stain_frame"] * interval
    joined["bf_timing_min"] = joined["bf_frame"] * interval
    return joined


def default_output_plot_path(bf_events_csv: Path, stain_events_csv: Path, output_plot: Path | None) -> Path:
    if output_plot is not None:
        return output_plot.resolve()
    return bf_events_csv.with_name(f"{bf_events_csv.stem}_vs_{stain_events_csv.stem}.png").resolve()


def write_scatter_plot(
    df: pd.DataFrame,
    output_plot: Path,
    *,
    xlabel: str,
    ylabel: str,
    title: str | None,
) -> None:
    fig, ax = plt.subplots(figsize=(7, 7))
    ax.scatter(
        df["stain_timing_min"],
        df["bf_timing_min"],
        s=38,
        alpha=0.82,
        color="#2364aa",
        edgecolors="white",
        linewidths=0.5,
    )

    min_value = float(np.nanmin([df["stain_timing_min"].min(), df["bf_timing_min"].min()]))
    max_value = float(np.nanmax([df["stain_timing_min"].max(), df["bf_timing_min"].max()]))
    if np.isfinite(min_value) and np.isfinite(max_value):
        ax.plot([min_value, max_value], [min_value, max_value], color="#7a7a7a", linewidth=1.0, alpha=0.65)

    annotation = f"n={len(df)}"
    ax.text(
        0.03,
        0.97,
        annotation,
        transform=ax.transAxes,
        ha="left",
        va="top",
        bbox={"boxstyle": "round,pad=0.3", "facecolor": "white", "alpha": 0.85, "edgecolor": "none"},
    )

    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.grid(alpha=0.22, linewidth=0.6)
    if title is not None:
        ax.set_title(title)

    output_plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_plot, dpi=160, bbox_inches="tight")
    plt.close(fig)


@app.command()
def cli(
    bf_events_csv: Path = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="CSV from apoptosis bf-class events.",
    ),
    stain_events_csv: Path = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="CSV from apoptosis stain detect-spikes.",
    ),
    output_plot: Path | None = typer.Option(
        None,
        "--output-plot",
        help="Output PNG path. Default: <bf_stem>_vs_<stain_stem>.png next to BF CSV.",
    ),
    output_csv: Path | None = typer.Option(
        None,
        "--output-csv",
        help="Optional joined ROI timing table.",
    ),
    bf_column: str | None = typer.Option(
        None,
        "--bf-column",
        help="BF frame column. Default: event_t.",
    ),
    stain_column: str | None = typer.Option(
        None,
        "--stain-column",
        help="Stain frame column. Default: spike_t.",
    ),
    interval: float = typer.Option(
        ...,
        "--interval",
        min=0.0,
        help="Minutes per frame. Used to convert frame timings to plot axes.",
    ),
    title: str | None = typer.Option(
        "TOTO-3 vs Bright field apoptosis timing",
        "--title",
        help="Optional plot title.",
    ),
) -> None:
    bf_events_csv = bf_events_csv.resolve()
    stain_events_csv = stain_events_csv.resolve()
    df = build_correlation_table(
        bf_events_csv,
        stain_events_csv,
        interval=interval,
        bf_timing_column=bf_column,
        stain_timing_column=stain_column,
    )
    resolved_output_plot = default_output_plot_path(bf_events_csv, stain_events_csv, output_plot)
    if output_csv is not None:
        output_csv = output_csv.resolve()
        output_csv.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_csv, index=False)

    write_scatter_plot(
        df,
        resolved_output_plot,
        xlabel="TOTO-3 timing (min)",
        ylabel="Bright field timing (min)",
        title=title,
    )
    print(f"Wrote correlation plot: {resolved_output_plot}")
    if output_csv is not None:
        print(f"Wrote joined timing CSV: {output_csv}")
    print(f"Plotted {len(df)} ROIs with timings in both inputs")


def main(argv: list[str] | None = None, *, prog_name: str = "apoptosis correlation") -> None:
    app(args=argv, prog_name=prog_name, standalone_mode=False)
