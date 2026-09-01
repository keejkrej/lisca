from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from transfection.app import app
from transfection.services.pipeline import format_pipeline_done, run_pipeline

NAME = "pipeline"
HELP = (
    "Run the full transfection order from assay.json: "
    "segment → timeseries → plot-timeseries → auc → plot-auc → fit → plot-fit. "
    "Analysis stages write analysis/ only; plot services write PNG and "
    "pipeline/CLI plot-* publish XLSX then plot so results/<sample>/ has tables + png. "
    "analysis.skipSegment skips segment and uses full-ROI timeseries."
)


@app.command(NAME, help=HELP)
def pipeline(
    workspace: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=False,
            dir_okay=True,
            metavar="WORKSPACE",
            help="Workspace with assay.json and roi/.",
        ),
    ],
    assay: Annotated[
        Path | None,
        typer.Option(
            "--assay",
            exists=True,
            file_okay=True,
            dir_okay=False,
            help="Path to assay.json (default: <workspace>/assay.json).",
        ),
    ] = None,
    force: Annotated[
        bool,
        typer.Option(
            "--force",
            "-f",
            help="Overwrite existing mask TIFFs during segment.",
        ),
    ] = False,
) -> None:
    result = run_pipeline(workspace=workspace, assay=assay, force=force)
    typer.echo(format_pipeline_done(result))
