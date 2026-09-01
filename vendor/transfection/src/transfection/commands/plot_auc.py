from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from transfection.app import app
from transfection.core import infer_workspace_root, load_assay_for_workspace, require_named_samples
from transfection.core.sample_pack import publish_sample_tables_xlsx
from transfection.services.plot_auc import (
    format_written_auc_plot_messages,
    run_plot_auc,
)

NAME = "plot-auc"
HELP = (
    "Read analysis/PosN/auc.csv (never recomputes AUC) and write "
    "results/<sample>/auc.xlsx plus the cross-sample results/auc.png boxplot. "
    "Requires samples[].name."
)


@app.command(NAME, help=HELP)
def plot_auc(
    auc_csv: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=True,
            dir_okay=True,
            metavar="WORKSPACE",
            help="Workspace root containing analysis/PosN/auc.csv.",
        ),
    ],
    output: Annotated[
        Path | None,
        typer.Option(
            "--output",
            "-o",
            help=(
                "Output PNG path for the cross-sample AUC boxplot. "
                "Default: results/auc.png."
            ),
        ),
    ] = None,
) -> None:
    workspace = infer_workspace_root(auc_csv)
    config = load_assay_for_workspace(workspace)
    mapping = require_named_samples(config)
    for path in publish_sample_tables_xlsx(workspace, mapping, "auc"):
        typer.echo(f"Wrote table: {path}")
    output_plots = run_plot_auc(auc_csv=auc_csv, output=output)
    for message in format_written_auc_plot_messages(list(output_plots)):
        typer.echo(message)
