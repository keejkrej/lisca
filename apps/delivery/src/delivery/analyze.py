from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import typer

from .expression import auc, plot_auc, plot_timeseries, timeseries


HELP = (
    "Run the full delivery analysis workflow for a slide-mapped ROI workspace and "
    "write timeseries CSVs, AUC summary, and plots."
)

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=HELP,
)


@dataclass(frozen=True)
class AnalyzeRunResult:
    dataset_root: Path
    slide: Path
    channel: int
    interval: float
    timeseries_csvs: list[Path]
    auc_csv: Path
    timeseries_plot: Path
    auc_plot: Path
    skipped_positions: dict[int, list[int]]


def run_analysis(
    dataset_root: Path,
    *,
    slide: Path,
    channel: int,
    interval: float,
    output_dir: Path | None,
    quartiles: str,
) -> AnalyzeRunResult:
    timeseries_result = timeseries.run_slide_timeseries(
        dataset_root,
        slide=slide,
        channel=channel,
        output_csv=output_dir,
        quartiles=quartiles,
    )
    timeseries_csvs = [path for _, path, _ in timeseries_result.written_outputs]
    auc_csv = auc.run_auc(timeseries_csvs, interval=interval, output_csv=None)
    timeseries_plot = plot_timeseries.run_plot_timeseries(
        timeseries_csvs,
        output_plot=None,
        columns=3,
        alpha=0.12,
        linewidth=1.0,
        color="#c03a2b",
        title=None,
    )
    auc_plot = plot_auc.run_plot_auc(
        auc_csv,
        output_plot=None,
        color="#c03a2b",
        title="AUC by slide channel",
    )
    return AnalyzeRunResult(
        dataset_root=dataset_root.resolve(),
        slide=slide.resolve(),
        channel=channel,
        interval=interval,
        timeseries_csvs=timeseries_csvs,
        auc_csv=auc_csv,
        timeseries_plot=timeseries_plot,
        auc_plot=auc_plot,
        skipped_positions=timeseries_result.skipped_positions,
    )


def to_result_payload(result: AnalyzeRunResult) -> dict[str, object]:
    return {
        "status": "success",
        "dataset_root": str(result.dataset_root),
        "slide": str(result.slide),
        "channel": result.channel,
        "interval": result.interval,
        "timeseries_csvs": [str(path) for path in result.timeseries_csvs],
        "auc_csv": str(result.auc_csv),
        "timeseries_plot": str(result.timeseries_plot),
        "auc_plot": str(result.auc_plot),
        "skipped_positions": result.skipped_positions,
    }


def to_error_payload(
    *,
    dataset_root: Path,
    slide: Path,
    channel: int,
    interval: float,
    error: Exception,
) -> dict[str, object]:
    return {
        "status": "error",
        "dataset_root": str(dataset_root.resolve()),
        "slide": str(slide.resolve()),
        "channel": channel,
        "interval": interval,
        "error": str(error),
    }


@app.command()
def cli(
    dataset_root: Path = typer.Argument(
        ...,
        exists=True,
        file_okay=False,
        dir_okay=True,
        help="Dataset root containing roi/PosN/index.json and Roi*.tif files.",
    ),
    slide: Path = typer.Option(
        ...,
        "--slide",
        exists=True,
        file_okay=True,
        dir_okay=False,
        help="Microscopy slide mapping JSON from slide channel to position list.",
    ),
    channel: int = typer.Option(
        ...,
        "--channel",
        min=0,
        help="Channel index in the cropped ROI TIFF timelapses.",
    ),
    interval: float = typer.Option(
        ...,
        "--interval",
        min=0.0,
        help="Frame interval in minutes used when integrating AUC.",
    ),
    output_dir: Path | None = typer.Option(
        None,
        "--output-dir",
        file_okay=False,
        dir_okay=True,
        help="Optional directory to write all generated outputs into.",
    ),
    quartiles: str = typer.Option(
        timeseries.DEFAULT_QUARTILES,
        "--quartiles",
        help="Comma-separated quantiles to write as qXX columns.",
    ),
    json_output: bool = typer.Option(
        False,
        "--json",
        help="Emit the final result payload as JSON on stdout.",
    ),
) -> None:
    try:
        result = run_analysis(
            dataset_root,
            slide=slide,
            channel=channel,
            interval=interval,
            output_dir=output_dir.resolve() if output_dir is not None else None,
            quartiles=quartiles,
        )
    except Exception as error:
        if json_output:
            typer.echo(
                json.dumps(
                    to_error_payload(
                        dataset_root=dataset_root,
                        slide=slide,
                        channel=channel,
                        interval=interval,
                        error=error,
                    ),
                    indent=2,
                )
            )
            raise typer.Exit(code=1)
        raise

    if result.skipped_positions:
        total_skipped_positions = sum(len(positions) for positions in result.skipped_positions.values())
        skipped_summary = "; ".join(
            f"slide channel {slide_channel} -> {', '.join(str(pos) for pos in positions)}"
            for slide_channel, positions in sorted(result.skipped_positions.items())
        )
        typer.echo(
            f"Skipped {total_skipped_positions} missing positions from slide mapping: {skipped_summary}",
            err=True,
        )

    typer.echo(
        f"Wrote {len(result.timeseries_csvs)} timeseries CSVs, AUC CSV, and plots for channel {result.channel}",
        err=True,
    )

    if json_output:
        typer.echo(json.dumps(to_result_payload(result), indent=2))
        return

    for csv_path in result.timeseries_csvs:
        typer.echo(f"Timeseries CSV: {csv_path}")
    typer.echo(f"AUC CSV: {result.auc_csv}")
    typer.echo(f"Timeseries plot: {result.timeseries_plot}")
    typer.echo(f"AUC plot: {result.auc_plot}")
