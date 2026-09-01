from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from transfection.app import app
from transfection.core import (
    infer_workspace_root,
    load_assay_for_workspace,
    require_named_samples,
    resolve_interval_minutes,
)
from transfection.core.sample_pack import publish_sample_traces_xlsx
from transfection.services.plot_timeseries import (
    format_written_timeseries_plot_message,
    run_plot_timeseries,
)

NAME = "plot-timeseries"
HELP = (
    "Read analysis/PosN/chC.csv (never recomputes traces) and write "
    "results/<sample>/traces.xlsx plus traces.png, traces_shared_y.png, "
    "traces_summary.png, traces_summary_shared_y.png, and area.png / area_shared_y.png. "
    "Requires samples[].name."
)


@app.command(NAME, help=HELP)
def plot_timeseries(
    metrics_dir: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=True,
            dir_okay=True,
            metavar="WORKSPACE|ANALYSIS_DIR",
            help="Workspace root or analysis/ directory.",
        ),
    ],
    interval: Annotated[
        float | None,
        typer.Option(
            "--interval",
            min=0.0,
            help="Minutes per frame. Default: workspace assay.json interval.",
        ),
    ] = None,
    output: Annotated[
        Path | None,
        typer.Option(
            "--output",
            "-o",
            help="Primary output PNG path when plotting a single sample. Default: results/<sample>/traces.png.",
        ),
    ] = None,
    columns: Annotated[
        int | None,
        typer.Option(
            "--columns",
            min=1,
            help="Unused for per-sample single-panel plots (kept for CLI compatibility).",
        ),
    ] = None,
    assay: Annotated[
        Path | None,
        typer.Option(
            "--assay",
            exists=True,
            file_okay=True,
            dir_okay=False,
            help="Path to assay.json for interval/labels (default: <workspace>/assay.json).",
        ),
    ] = None,
) -> None:
    workspace = infer_workspace_root(metrics_dir)
    config = load_assay_for_workspace(workspace, assay)
    mapping = require_named_samples(config)
    for path in publish_sample_traces_xlsx(workspace, mapping):
        typer.echo(f"Wrote table: {path}")
    resolved = resolve_interval_minutes(workspace, assay=assay, override=interval)
    written_plots = run_plot_timeseries(
        metrics_dir=workspace,
        interval=resolved,
        output=output,
        columns=columns,
    )
    for output_plot in written_plots:
        typer.echo(format_written_timeseries_plot_message(output_plot))
