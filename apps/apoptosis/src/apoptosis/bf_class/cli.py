from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from .config import (
    DEFAULT_ARTIFACT_ROOT,
    DEFAULT_BATCH_SIZE,
    DEFAULT_EPOCHS,
    DEFAULT_IMAGE_SIZE,
    DEFAULT_LR,
    DEFAULT_NUM_WORKERS,
    DEFAULT_SEED,
    DEFAULT_THRESHOLD,
    DEFAULT_WEIGHT_DECAY,
    TrainingConfig,
)
from .dataset_conversion import POSITION_NAME, convert_dataset, default_output_root, print_summary
from .events import run_batch_events
from .inference import predict_timelapse
from .plotting import plot_score_series
from .training import train_model


app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help="Bright-field frame classification workflows.",
)


@app.command(name="convert-dataset")
def convert_dataset_command(
    input_root: Annotated[
        Path,
        typer.Option(
            "--input-root",
            exists=True,
            file_okay=False,
            help="Dataset root containing 'annotations' and 'roi'.",
        ),
    ],
    output_root: Annotated[
        Path | None,
        typer.Option(
            "--output-root",
            help=(
                "Output dataset root. Default: <input-root>/bf_frame_dataset. "
                "Images are written under images/live, images/dead, and images/mixed."
            ),
        ),
    ] = None,
    position: Annotated[
        str,
        typer.Option(
            "--position",
            help=f"Position folder name inside annotations/roi and roi. Default: {POSITION_NAME}",
        ),
    ] = POSITION_NAME,
) -> None:
    """Convert annotated ROI timelapses into per-frame BF TIFFs and soft labels."""

    input_root = input_root.resolve()
    resolved_output_root = output_root.resolve() if output_root is not None else default_output_root(input_root)
    summary = convert_dataset(input_root, resolved_output_root, position=position)
    print_summary(summary, resolved_output_root)


@app.command(name="train")
def train_command(
    dataset_root: Annotated[
        Path,
        typer.Option("--dataset-root", exists=True, file_okay=False),
    ],
    artifact_root: Annotated[Path, typer.Option("--artifact-root")] = DEFAULT_ARTIFACT_ROOT,
    run_name: Annotated[str | None, typer.Option("--run-name")] = None,
    epochs: Annotated[int, typer.Option("--epochs", min=1)] = DEFAULT_EPOCHS,
    batch_size: Annotated[int, typer.Option("--batch-size", min=1)] = DEFAULT_BATCH_SIZE,
    image_size: Annotated[int, typer.Option("--image-size", min=1)] = DEFAULT_IMAGE_SIZE,
    lr: Annotated[float, typer.Option("--lr", min=0.0)] = DEFAULT_LR,
    weight_decay: Annotated[float, typer.Option("--weight-decay", min=0.0)] = DEFAULT_WEIGHT_DECAY,
    seed: Annotated[int, typer.Option("--seed")] = DEFAULT_SEED,
    num_workers: Annotated[int, typer.Option("--num-workers", min=0)] = DEFAULT_NUM_WORKERS,
    threshold: Annotated[float, typer.Option("--threshold", min=0.0, max=1.0)] = DEFAULT_THRESHOLD,
    device: Annotated[str, typer.Option("--device")] = "auto",
    pretrained: Annotated[
        bool,
        typer.Option(
            "--pretrained/--no-pretrained",
            help="Use ImageNet-pretrained ResNet18 weights.",
        ),
    ] = True,
) -> None:
    """Train a soft-target binary ResNet18 on BF frame labels."""

    config = TrainingConfig(
        dataset_root=dataset_root.resolve(),
        artifact_root=artifact_root.resolve(),
        run_name=run_name,
        epochs=epochs,
        batch_size=batch_size,
        image_size=image_size,
        lr=lr,
        weight_decay=weight_decay,
        seed=seed,
        num_workers=num_workers,
        threshold=threshold,
        pretrained=pretrained,
        device=device,
    )
    artifacts = train_model(config)
    print(f"Run directory: {artifacts.run_dir}")
    print(f"Best checkpoint: {artifacts.best_checkpoint_path}")
    print(f"Last checkpoint: {artifacts.last_checkpoint_path}")
    print(f"Metrics CSV: {artifacts.metrics_csv_path}")
    print(f"Test metrics JSON: {artifacts.test_metrics_path}")


@app.command(name="infer")
def infer_command(
    checkpoint: Annotated[Path, typer.Argument(help="Trained checkpoint path.")],
    tif: Annotated[Path, typer.Argument(help="Input TIFF timelapse or single frame.")],
    channel: Annotated[int, typer.Option("--channel", min=0)] = 0,
    channel_count: Annotated[int | None, typer.Option("--channel-count", min=1)] = None,
    output_csv: Annotated[Path | None, typer.Option("--output-csv")] = None,
    device: Annotated[str, typer.Option("--device")] = "auto",
    threshold: Annotated[float | None, typer.Option("--threshold", min=0.0, max=1.0)] = None,
    batch_size: Annotated[int, typer.Option("--batch-size", min=1)] = 64,
) -> None:
    """Run timelapse inference with a trained BF ResNet checkpoint."""

    prediction = predict_timelapse(
        checkpoint_path=checkpoint,
        tif_path=tif,
        channel=channel,
        channel_count=channel_count,
        output_csv_path=output_csv,
        device=device,
        threshold=threshold,
        batch_size=batch_size,
    )
    probabilities = [row.dead_probability for row in prediction.rows]
    print(f"Input TIFF: {prediction.input_path}")
    print(f"Checkpoint: {prediction.checkpoint_path}")
    print(f"Output CSV: {prediction.output_csv_path}")
    print(f"Channel: {prediction.channel}")
    print(f"Frames scored: {prediction.frame_count}")
    print(f"Threshold: {prediction.threshold:.3f}")
    print(f"Min dead probability: {min(probabilities):.6f}")
    print(f"Max dead probability: {max(probabilities):.6f}")
    print(f"Mean dead probability: {sum(probabilities) / len(probabilities):.6f}")


@app.command(name="plot-scores")
def plot_scores_command(
    scores_csv: Annotated[Path, typer.Argument(exists=True, dir_okay=False)],
    output_plot: Annotated[
        Path | None,
        typer.Option("--output-plot", help="Output PNG path. Default: same path as the CSV with .png extension."),
    ] = None,
    title: Annotated[str | None, typer.Option("--title")] = None,
) -> None:
    """Plot a per-frame dead-probability score series from inference CSV output."""

    output_path = plot_score_series(
        scores_csv,
        output_png_path=output_plot,
        title=title,
    )
    print(f"Wrote plot: {output_path}")


@app.command(name="detect-events")
def detect_events_command(
    checkpoint: Annotated[Path, typer.Argument(help="Trained checkpoint path.")],
    roi_root: Annotated[
        Path,
        typer.Argument(help="Folder containing Roi*.tif and optional index.json."),
    ],
    channel: Annotated[int, typer.Option("--channel", min=0)] = 0,
    channel_count: Annotated[int | None, typer.Option("--channel-count", min=1)] = None,
    output_csv: Annotated[Path, typer.Option("--output-csv", help="Output event CSV path.")] = ...,
    output_scores_csv: Annotated[
        Path | None,
        typer.Option("--output-scores-csv", help="Optional long-form per-frame scores CSV for all ROIs."),
    ] = None,
    device: Annotated[str, typer.Option("--device")] = "auto",
    threshold: Annotated[float | None, typer.Option("--threshold", min=0.0, max=1.0)] = None,
    hold_frames: Annotated[int, typer.Option("--hold-frames", min=1)] = 1,
    batch_size: Annotated[int, typer.Option("--batch-size", min=1)] = 64,
) -> None:
    """Score every ROI TIFF and write one apoptosis-event timing row per ROI."""

    result = run_batch_events(
        checkpoint_path=checkpoint,
        roi_root=roi_root,
        channel=channel,
        channel_count=channel_count,
        output_csv_path=output_csv,
        output_scores_csv_path=output_scores_csv,
        device=device,
        threshold=threshold,
        hold_frames=hold_frames,
        batch_size=batch_size,
    )
    detected_count = sum(1 for event in result.events if event.detected)
    print(f"Wrote event CSV: {result.events_csv_path}")
    if result.scores_csv_path is not None:
        print(f"Wrote scores CSV: {result.scores_csv_path}")
    print(f"Detected apoptosis events for {detected_count}/{len(result.events)} ROIs")


def convert_dataset_main(argv: list[str] | None = None) -> None:
    app(args=["convert-dataset", *(argv or [])], prog_name="apoptosis bf-class", standalone_mode=False)


def train_main(argv: list[str] | None = None) -> None:
    app(args=["train", *(argv or [])], prog_name="apoptosis bf-class", standalone_mode=False)


def infer_main(argv: list[str] | None = None) -> None:
    app(args=["infer", *(argv or [])], prog_name="apoptosis bf-class", standalone_mode=False)


def plot_main(argv: list[str] | None = None) -> None:
    app(args=["plot-scores", *(argv or [])], prog_name="apoptosis bf-class", standalone_mode=False)


def events_main(argv: list[str] | None = None) -> None:
    app(args=["detect-events", *(argv or [])], prog_name="apoptosis bf-class", standalone_mode=False)
