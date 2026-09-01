from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from transfection.app import app
from transfection.services.segment import (
    format_skipped_positions_message,
    format_written_masks_message,
    run_segment,
)

NAME = "segment"
HELP = (
    "Segment each mapped ROI with variation → Gaussian → Otsu using assay.json sample rows, "
    "and write per-frame mask TIFFs under <workspace>/mask/PosN/."
)


@app.command(NAME, help=HELP)
def segment(
    workspace: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=False,
            dir_okay=True,
            metavar="WORKSPACE",
            help="Workspace with assay.json and roi/PosN/.",
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
    variation_radius: Annotated[
        int,
        typer.Option(
            "--variation-radius",
            min=0,
            help="Radius in pixels for the local variation filter before Gaussian smoothing.",
        ),
    ] = 2,
    gaussian_sigma: Annotated[
        float,
        typer.Option(
            "--gaussian-sigma",
            min=0.0,
            help="Sigma in pixels for Gaussian smoothing after local variation filtering.",
        ),
    ] = 1.0,
    force: Annotated[
        bool,
        typer.Option(
            "--force",
            "-f",
            help="Overwrite existing mask TIFF files.",
        ),
    ] = False,
) -> None:
    result = run_segment(
        workspace=workspace,
        assay=assay,
        variation_radius=variation_radius,
        gaussian_sigma=gaussian_sigma,
        force=force,
        on_mask_written=lambda slide_channel, output_dir, mask_count: typer.echo(
            format_written_masks_message(slide_channel, output_dir, mask_count)
        ),
    )
    if result.skipped_positions:
        typer.echo(format_skipped_positions_message(result.skipped_positions))
