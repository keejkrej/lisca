from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from transfection.app import app
from transfection.services.check_segment import (
    format_skipped_positions_message,
    format_written_check_segment_video_message,
    run_check_segment,
)

NAME = "check-segment"
HELP = (
    "Overlay mask contours on ROI TIFF signal/mask channels and write MP4 review videos "
    "under <workspace>/check-segment/PosN/. Manual QA only; not part of pipeline."
)


@app.command(NAME, help=HELP)
def check_segment(
    workspace: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=False,
            dir_okay=True,
            metavar="WORKSPACE",
            help="Workspace with assay.json, roi/, and mask/.",
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
    output: Annotated[
        Path | None,
        typer.Option(
            "--output",
            "-o",
            file_okay=False,
            dir_okay=True,
            help="Directory for MP4 outputs. Default: <workspace>/check-segment/.",
        ),
    ] = None,
    fps: Annotated[
        float,
        typer.Option(
            "--fps",
            min=0.001,
            help="Frames per second for each check-segment MP4.",
        ),
    ] = 6.0,
    force: Annotated[
        bool,
        typer.Option(
            "--force",
            "-f",
            help="Overwrite existing MP4 files.",
        ),
    ] = False,
) -> None:
    result = run_check_segment(
        workspace=workspace,
        assay=assay,
        output=output,
        fps=fps,
        force=force,
        on_video_written=lambda video: typer.echo(
            format_written_check_segment_video_message(video)
        ),
    )
    if result.skipped_positions:
        typer.echo(format_skipped_positions_message(result.skipped_positions))
