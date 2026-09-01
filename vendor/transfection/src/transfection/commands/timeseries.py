from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from transfection.app import app
from transfection.services.timeseries import (
    DELIVERY_CORRECTION_QUARTILE,
    format_skipped_positions_message,
    format_written_timeseries_csv_message,
    run_timeseries,
)

NAME = "timeseries"
HELP = (
    "Read roi/PosN stacks, compute intensity metrics per position, "
    "and write analysis/PosN/chC.csv (CSV only). Sample names are not required; "
    "plot-timeseries groups into results/<sample>/ later. "
    "Uses assay.json analysis.skipSegment to choose masked vs full-ROI metrics."
)


@app.command(NAME, help=HELP)
def timeseries(
    workspace: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=False,
            dir_okay=True,
            metavar="WORKSPACE",
            help="Workspace with assay.json, roi/, and mask/ (unless analysis.skipSegment).",
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
    mask_channel: Annotated[
        int | None,
        typer.Option(
            "--mask-channel",
            min=0,
            help="Override mask TIFF channel. Defaults to analysis.channels.mask / sampleChannels.",
        ),
    ] = None,
    correction_quartile: Annotated[
        float,
        typer.Option(
            "--correction-quartile",
            help="Deprecated; timeseries uses segment masks for background correction.",
        ),
    ] = DELIVERY_CORRECTION_QUARTILE,
) -> None:
    result = run_timeseries(
        workspace=workspace,
        assay=assay,
        mask_channel=mask_channel,
        correction_quartile=correction_quartile,
        on_csv_written=lambda position, resolved_output_csv, row_count: typer.echo(
            format_written_timeseries_csv_message(position, resolved_output_csv, row_count)
        ),
    )
    if result.skipped_positions:
        typer.echo(format_skipped_positions_message(result.skipped_positions))
