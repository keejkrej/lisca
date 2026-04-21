from __future__ import annotations

import math
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import typer

from lisca.analysis.roi import load_timeseries_csv

from . import auc

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help="Plot one or more ROI timeseries CSVs as subplots in a single PNG.",
)


def run_plot_timeseries(
    timeseries_csvs: list[Path],
    *,
    output_plot: Path | None,
    columns: int,
    alpha: float,
    linewidth: float,
    color: str,
    title: str | None,
) -> Path:
    resolved_csvs = sorted((csv_path.resolve() for csv_path in timeseries_csvs), key=lambda path: path.name)
    resolved_output_plot = default_output_plot_path(resolved_csvs, output_plot)
    write_subplot_grid(
        resolved_csvs,
        resolved_output_plot,
        alpha=alpha,
        linewidth=linewidth,
        color=color,
        title=title,
        columns=columns,
    )
    return resolved_output_plot


def normalize_output_stem(csv_path: Path, *, drop_image_channel: bool = False) -> str:
    return auc.normalize_output_stem(csv_path, drop_image_channel=drop_image_channel)


def default_output_plot_path(timeseries_csvs: list[Path], output_plot: Path | None) -> Path:
    if output_plot is not None:
        return output_plot.resolve()
    stem = auc.aggregate_output_stem(timeseries_csvs)
    return timeseries_csvs[0].with_name(f"{stem}_combined.png").resolve()


def subplot_title(csv_path: Path, trace_count: int | None = None) -> str:
    match = re.search(r"_sc(\d+)(?=_|$)", csv_path.stem)
    if match is not None:
        label = f"slide channel {int(match.group(1))}"
    else:
        label = csv_path.stem
    if trace_count is None:
        return label
    return f"{label} ({trace_count} traces)"


def trace_group_columns(df) -> list[str]:
    columns = ["roi"]
    if "pos" in df.columns:
        columns.insert(0, "pos")
    return columns


def write_subplot_grid(
    timeseries_csvs: list[Path],
    output_plot: Path,
    *,
    alpha: float,
    linewidth: float,
    color: str,
    title: str | None,
    columns: int,
) -> None:
    rows = math.ceil(len(timeseries_csvs) / columns)
    fig, axes = plt.subplots(rows, columns, figsize=(6.0 * columns, 4.8 * rows), squeeze=False)
    axes_flat = axes.flatten()

    for ax, csv_path in zip(axes_flat, timeseries_csvs):
        df = load_timeseries_csv(csv_path)
        trace_groups = df.groupby(trace_group_columns(df), sort=True, dropna=False)
        for _, roi_df in trace_groups:
            ax.plot(
                roi_df["t"],
                roi_df["corrected"],
                color=color,
                alpha=alpha,
                linewidth=linewidth,
            )
        ax.set_title(subplot_title(csv_path, trace_groups.ngroups))
        ax.set_xlabel("frame")
        ax.set_ylabel("corrected intensity")

    for ax in axes_flat[len(timeseries_csvs):]:
        ax.axis("off")

    if title is not None:
        fig.suptitle(title)
        fig.tight_layout(rect=(0.0, 0.0, 1.0, 0.97))
    else:
        fig.tight_layout()

    output_plot.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_plot, dpi=150, bbox_inches="tight")
    plt.close(fig)


def format_written_timeseries_plot_message(output_plot: Path) -> str:
    return f"Wrote plot: {output_plot}"


@app.command()
def cli(
    timeseries_csvs: list[Path] = typer.Argument(
        ...,
        exists=True,
        dir_okay=False,
        help="One or more long-form ROI timeseries CSV files to plot together.",
    ),
    output_plot: Path | None = typer.Option(
        None,
        "--output-plot",
        help="Output PNG path. Default: derive a shared <stem>_combined.png path.",
    ),
    columns: int = typer.Option(
        3,
        "--columns",
        min=1,
        help="Number of subplot columns in the output grid.",
    ),
    alpha: float = typer.Option(
        0.12,
        "--alpha",
        min=0.0,
        max=1.0,
        help="Per-trace opacity.",
    ),
    linewidth: float = typer.Option(
        1.0,
        "--linewidth",
        min=0.1,
        help="Per-trace line width.",
    ),
    color: str = typer.Option(
        "#c03a2b",
        "--color",
        help="Matplotlib color for all traces.",
    ),
    title: str | None = typer.Option(
        None,
        "--title",
        help="Optional figure title.",
    ),
) -> None:
    resolved_output_plot = run_plot_timeseries(
        timeseries_csvs,
        output_plot=output_plot,
        columns=columns,
        alpha=alpha,
        linewidth=linewidth,
        color=color,
        title=title,
    )
    print(format_written_timeseries_plot_message(resolved_output_plot))


def main(argv: list[str] | None = None, *, prog_name: str = "delivery expression plot timeseries") -> None:
    app(args=argv, prog_name=prog_name)


if __name__ == "__main__":
    main()
