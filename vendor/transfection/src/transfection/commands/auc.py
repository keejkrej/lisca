from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from transfection.app import app
from transfection.core import load_assay_for_workspace, require_interval_minutes
from transfection.services.auc import format_written_auc_csv_message, run_auc

NAME = "auc"
HELP = (
    "Integrate every metrics CSV in <workspace>/analysis/ and write "
    "analysis/PosN/auc.csv (CSV only). Does not require samples[].name; "
    "plot-auc concatenates into results/<sample>/auc.xlsx."
)


@app.command(NAME, help=HELP)
def auc(
    workspace: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=False,
            dir_okay=True,
            metavar="WORKSPACE",
            help="Workspace with analysis/ and assay.json (for default interval).",
        ),
    ],
    interval: Annotated[
        float | None,
        typer.Option(
            "--interval",
            min=0.0,
            help="Frame interval in minutes. Default: assay.json interval.value/unit.",
        ),
    ] = None,
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
) -> None:
    config = load_assay_for_workspace(workspace, assay)
    resolved = require_interval_minutes(config, override=interval)
    written = run_auc(workspace=workspace, interval=resolved)
    typer.echo(format_written_auc_csv_message(written))
