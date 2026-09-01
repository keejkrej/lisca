from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from transfection.app import app
from transfection.core import load_assay_for_workspace, require_interval_minutes
from transfection.services.fit import format_written_fit_csv_message, run_fit

NAME = "fit"
HELP = (
    "Fit analysis traces to the two-exponential kinetic model and write "
    "analysis/PosN/fit.csv (CSV only). Does not require samples[].name; "
    "plot-fit concatenates into results/<sample>/fit.xlsx."
)


@app.command(NAME, help=HELP)
def fit(
    workspace: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=False,
            dir_okay=True,
            metavar="WORKSPACE",
            help="Workspace with analysis/ and assay.json.",
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
    max_onset_minutes: Annotated[
        float | None,
        typer.Option(
            "--max-onset-minutes",
            min=0.0,
            help=(
                "Cap on second-pass onset time t0 candidates (minutes). "
                "Default: assay.json analysis.maxOnsetMinutes, else 120. "
                "0 keeps onset fixed at 0."
            ),
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
    resolved_interval = require_interval_minutes(config, override=interval)
    resolved_onset = (
        config.max_onset_minutes if max_onset_minutes is None else max_onset_minutes
    )
    written = run_fit(
        workspace=workspace,
        interval=resolved_interval,
        max_onset_minutes=resolved_onset,
    )
    typer.echo(format_written_fit_csv_message(written))
