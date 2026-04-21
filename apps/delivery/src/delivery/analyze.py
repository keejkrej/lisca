from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import typer

from .expression import auc, fit, plot_auc, plot_timeseries, timeseries


HELP = (
    "Run the full delivery analysis workflow for a slide-mapped ROI workspace and "
    "write timeseries CSVs, AUC summary, exponential fit summary, and plots."
)

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=HELP,
)


@dataclass(frozen=True)
class AnalyzeRunResult:
    workspace: Path
    slide: Path
    channel: int
    interval: float
    timeseries_csvs: list[Path]
    auc_csv: Path
    fit_csv: Path
    timeseries_plot: Path
    auc_plot: Path
    skipped_positions: dict[int, list[int]]


StageCallback = Callable[[int, int, str], None]
OutputCallback = Callable[[str], None]


def run_analysis(
    workspace: Path,
    *,
    slide: Path,
    channel: int,
    interval: float,
    on_stage: StageCallback | None = None,
    on_output: OutputCallback | None = None,
) -> AnalyzeRunResult:
    total_steps = 5
    if on_stage is not None:
        on_stage(0, total_steps, "Computing timeseries CSVs")
    timeseries_result = timeseries.run_slide_timeseries(
        workspace,
        slide=slide,
        channel=channel,
        output_csv=None,
        on_csv_written=(
            None
            if on_output is None
            else lambda slide_channel, output_csv, position_count: on_output(
                timeseries.format_written_timeseries_csv_message(
                    slide_channel,
                    output_csv,
                    position_count,
                )
            )
        ),
    )
    if timeseries_result.skipped_positions and on_output is not None:
        on_output(timeseries.format_skipped_positions_message(timeseries_result.skipped_positions))
    timeseries_csvs = [path for _, path, _ in timeseries_result.written_outputs]
    if on_stage is not None:
        on_stage(1, total_steps, "Computing AUC summary")
    auc_csv = auc.run_auc(timeseries_csvs, interval=interval, output_csv=None)
    if on_output is not None:
        on_output(auc.format_written_auc_csv_message(auc_csv))
    if on_stage is not None:
        on_stage(2, total_steps, "Computing exponential fit summary")
    fit_csv = fit.run_fit(timeseries_csvs, interval=interval, output_csv=None)
    if on_output is not None:
        on_output(fit.format_written_fit_csv_message(fit_csv))
    if on_stage is not None:
        on_stage(3, total_steps, "Rendering timeseries plot")
    timeseries_plot = plot_timeseries.run_plot_timeseries(
        timeseries_csvs,
        output_plot=None,
        columns=3,
        alpha=0.12,
        linewidth=1.0,
        color="#c03a2b",
        title=None,
    )
    if on_output is not None:
        on_output(plot_timeseries.format_written_timeseries_plot_message(timeseries_plot))
    if on_stage is not None:
        on_stage(4, total_steps, "Rendering AUC plot")
    auc_plot = plot_auc.run_plot_auc(
        auc_csv,
        output_plot=None,
        color="#c03a2b",
        title="AUC by slide channel",
    )
    if on_output is not None:
        on_output(plot_auc.format_written_auc_plot_message(auc_plot))
    result = AnalyzeRunResult(
        workspace=workspace.resolve(),
        slide=slide.resolve(),
        channel=channel,
        interval=interval,
        timeseries_csvs=timeseries_csvs,
        auc_csv=auc_csv,
        fit_csv=fit_csv,
        timeseries_plot=timeseries_plot,
        auc_plot=auc_plot,
        skipped_positions=timeseries_result.skipped_positions,
    )
    if on_stage is not None:
        on_stage(total_steps, total_steps, "Analysis complete")
    return result


@app.command()
def cli(
    workspace: Path = typer.Argument(
        ...,
        exists=True,
        file_okay=False,
        dir_okay=True,
        help="Workspace containing roi/PosN/index.json and Roi*.tif files.",
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
        help=(
            "Frame interval in minutes used when integrating AUC and fitting "
            "y=intensity_offset + expression_amplitude * "
            "(exp(-protein_decay_rate*t) - exp(-mrna_decay_rate*t))."
        ),
    ),
) -> None:
    try:
        result = run_analysis(
            workspace,
            slide=slide,
            channel=channel,
            interval=interval,
            on_output=lambda message: typer.echo(message, err=True),
        )
    except Exception as error:
        typer.echo(f"Analysis failed: {error}", err=True)
        raise

    typer.echo(
        f"Completed analysis for channel {result.channel}: {len(result.timeseries_csvs)} timeseries CSVs, "
        "1 AUC CSV, 1 fit CSV, and 2 plots.",
        err=True,
    )
