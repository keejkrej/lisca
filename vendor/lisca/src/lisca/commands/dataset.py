from __future__ import annotations

import json
from pathlib import Path

import typer

from lisca.app import dataset_app
from lisca.services.cpsam_label import LabelCpsamOptions, label_cpsam
from lisca.services.gene_expression_seg_dataset import (
    CreateGeneExpressionSegDatasetOptions,
    create_gene_expression_seg_dataset,
)
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


def _parse_int_list(value: str | None) -> list[int] | None:
    if value is None:
        return None
    return [int(part.strip()) for part in value.split(",") if part.strip()]


@dataset_app.command("label-cpsam")
def label_cpsam_cmd(
    workspace: Path = typer.Option(..., exists=True, file_okay=False),
    output: Path = typer.Option(..., file_okay=False),
    channel: int = typer.Option(0, "--channel", help="BF / mask channel index."),
    z: int = typer.Option(0, "--z"),
    time_stride: int = typer.Option(20, "--time-stride"),
    times: str | None = typer.Option(
        None, "--times", help="Comma-separated time indices (overrides stride)."
    ),
    positions: str | None = typer.Option(None, "--positions"),
    force: bool = typer.Option(False, "--force", "-f"),
    preview_count: int = typer.Option(8, "--preview-count"),
    batch_size: int = typer.Option(8, "--batch-size"),
) -> None:
    """Pseudo-label ROI BF frames with Cellpose cpsam (binary fg/bg)."""
    try:
        manifest = label_cpsam(
            LabelCpsamOptions(
                workspace=workspace,
                output=output,
                channel=channel,
                z=z,
                time_stride=time_stride,
                times=_parse_int_list(times),
                positions=_parse_int_list(positions),
                force=force,
                preview_count=preview_count,
                batch_size=batch_size,
            )
        )
    except ImportError as error:
        msg = (
            "cellpose is missing; run `uv sync --group label` (or --group train) "
            "in python/"
        )
        raise typer.BadParameter(msg) from error

    typer.echo(f"Wrote cpsam labels to {output}")
    typer.echo(json.dumps(manifest["counts"], indent=2))


@dataset_app.command("create-gene-expression-seg")
def create_gene_expression_seg(
    labels: Path = typer.Option(
        ...,
        exists=True,
        file_okay=False,
        help="Output directory from `lisca dataset label-cpsam`.",
    ),
    output: Path = typer.Option(..., file_okay=False),
    val_fraction: float = typer.Option(0.15, "--val-fraction"),
    val_positions: str | None = typer.Option(None, "--val-positions"),
    seed: int = typer.Option(42, "--seed"),
    min_fg_fraction: float = typer.Option(0.0, "--min-fg-fraction"),
    max_fg_fraction: float = typer.Option(1.0, "--max-fg-fraction"),
) -> None:
    """Materialize train/val fg/bg pairs from cpsam labels (position hold-out)."""
    manifest = create_gene_expression_seg_dataset(
        CreateGeneExpressionSegDatasetOptions(
            labels=labels,
            output=output,
            val_fraction=val_fraction,
            val_positions=_parse_int_list(val_positions),
            seed=seed,
            min_fg_fraction=min_fg_fraction,
            max_fg_fraction=max_fg_fraction,
        )
    )
    typer.echo(f"Wrote dataset to {output}")
    typer.echo(json.dumps(manifest["counts"], indent=2))


@dataset_app.command("train-gene-expression-seg")
def train_gene_expression_seg_cmd(
    dataset: Path = typer.Option(..., exists=True, file_okay=False),
    output: Path = typer.Option(..., file_okay=False),
    epochs: int = typer.Option(40, "--epochs"),
    batch_size: int = typer.Option(16, "--batch-size"),
    learning_rate: float = typer.Option(1e-3, "--lr"),
    image_size: int = typer.Option(128, "--image-size"),
    base_channels: int = typer.Option(32, "--base-channels"),
    accelerator: str = typer.Option("auto", "--accelerator"),
    seed: int = typer.Option(42, "--seed"),
) -> None:
    """Train a small U-Net for gene-expression BF fg/bg segmentation."""
    try:
        from lisca.services.gene_expression_seg_train import (
            TrainGeneExpressionSegOptions,
            train_gene_expression_seg as run_training,
        )
    except ImportError as error:
        msg = (
            "training dependencies are missing; run `uv sync --group train` in python/"
        )
        raise typer.BadParameter(msg) from error

    result = run_training(
        TrainGeneExpressionSegOptions(
            dataset=dataset,
            output=output,
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            image_size=image_size,
            base_channels=base_channels,
            accelerator=accelerator,
            seed=seed,
        )
    )
    typer.echo(f"Training run saved to {result['run_dir']}")
    typer.echo(json.dumps(result["metrics"], indent=2))
