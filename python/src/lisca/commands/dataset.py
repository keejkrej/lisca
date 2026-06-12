from __future__ import annotations

import json
from pathlib import Path

import typer

from lisca.app import dataset_app
from lisca.services.smart_exclusion_dataset import (
    CreateSmartExclusionDatasetOptions,
    create_smart_exclusion_dataset,
)


def _parse_positions(value: str | None) -> list[int] | None:
    if value is None:
        return None
    return [int(part.strip()) for part in value.split(",") if part.strip()]


@dataset_app.command("create-smart-exclusion")
def create_smart_exclusion(
    workspace: Path = typer.Option(..., exists=True, file_okay=False),
    source: Path = typer.Option(..., exists=True, file_okay=False),
    output: Path = typer.Option(..., file_okay=False),
    time: int = typer.Option(0, "--time"),
    channel: int = typer.Option(0, "--channel"),
    z: int = typer.Option(0, "--z"),
    image_size: int | None = typer.Option(None, "--image-size"),
    min_area_ratio: float = typer.Option(0.8, "--min-area-ratio"),
    positions: str | None = typer.Option(None, "--positions"),
    val_positions: str | None = typer.Option(None, "--val-positions"),
) -> None:
    """Build a binary ROI dataset for smart exclusion model training."""
    manifest = create_smart_exclusion_dataset(
        CreateSmartExclusionDatasetOptions(
            workspace=workspace,
            source=source,
            output=output,
            time=time,
            channel=channel,
            z=z,
            image_size=image_size,
            min_area_ratio=min_area_ratio,
            positions=_parse_positions(positions),
            val_positions=_parse_positions(val_positions),
        )
    )
    typer.echo(f"Wrote dataset to {output}")
    typer.echo(json.dumps(manifest["counts"], indent=2))


@dataset_app.command("train-smart-exclusion")
def train_smart_exclusion(
    dataset: Path = typer.Option(..., exists=True, file_okay=False),
    output: Path = typer.Option(..., file_okay=False),
    epochs: int = typer.Option(25, "--epochs"),
    batch_size: int = typer.Option(32, "--batch-size"),
    learning_rate: float = typer.Option(1e-4, "--lr"),
    image_size: int = typer.Option(224, "--image-size"),
    accelerator: str = typer.Option("auto", "--accelerator"),
    seed: int = typer.Option(42, "--seed"),
) -> None:
    """Train a ResNet-18 smart exclusion classifier with PyTorch Lightning."""
    try:
        from lisca.services.smart_exclusion_train import (
            TrainSmartExclusionOptions,
            train_smart_exclusion as run_training,
        )
    except ImportError as error:
        msg = (
            "training dependencies are missing; run `uv sync --group train` in python/"
        )
        raise typer.BadParameter(msg) from error

    result = run_training(
        TrainSmartExclusionOptions(
            dataset=dataset,
            output=output,
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            image_size=image_size,
            accelerator=accelerator,
            seed=seed,
        )
    )
    typer.echo(f"Training run saved to {result['run_dir']}")
    typer.echo(json.dumps(result["metrics"], indent=2))
