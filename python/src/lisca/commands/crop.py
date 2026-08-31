from __future__ import annotations

from pathlib import Path

import typer

from lisca.app import app
from lisca.services import crop


def _parse_positions(value: str | None) -> list[int] | None:
    if value is None:
        return None
    return [int(part.strip()) for part in value.split(",") if part.strip()]


@app.command("crop")
def crop_cmd(
    workspace: Path = typer.Option(..., exists=True, file_okay=False),
    source: Path = typer.Option(..., exists=True, dir_okay=False),
    positions: str | None = typer.Option(
        None,
        "--positions",
        help="Comma-separated zero-based Pos indices. Default: every bbox/Pos*.csv.",
    ),
) -> None:
    """Crop ND2/CZI frames into roi/PosN TIFF stacks from bbox CSVs."""
    result = crop.run_crop(
        workspace=workspace,
        source=source,
        positions=_parse_positions(positions),
        on_progress=typer.echo,
    )
    for written in result.written:
        typer.echo(crop.format_written_crop_message(written))
    if result.skipped_missing_bbox:
        typer.echo(f"Skipped missing bbox CSVs: {result.skipped_missing_bbox}")
