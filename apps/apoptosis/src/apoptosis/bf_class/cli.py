from __future__ import annotations

import argparse
from pathlib import Path

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


def build_convert_dataset_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Convert annotated ROI timelapses into one bright-field C0 TIFF per frame "
            "plus a CSV with dead-probability soft labels."
        )
    )
    parser.add_argument(
        "--input-root",
        type=Path,
        required=True,
        help="Dataset root containing 'annotations' and 'roi'.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
        help=(
            "Output dataset root. Default: <input-root>/bf_frame_dataset. "
            "Images are written under images/live, images/dead, and images/mixed."
        ),
    )
    parser.add_argument(
        "--position",
        default=POSITION_NAME,
        help=f"Position folder name inside annotations/roi and roi. Default: {POSITION_NAME}",
    )
    return parser


def build_train_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Train a soft-target binary ResNet18 on bright-field TIFF frames using "
            "dead_probability from labels.csv."
        )
    )
    parser.add_argument("--dataset-root", type=Path, required=True)
    parser.add_argument("--artifact-root", type=Path, default=DEFAULT_ARTIFACT_ROOT)
    parser.add_argument("--run-name", default=None)
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--image-size", type=int, default=DEFAULT_IMAGE_SIZE)
    parser.add_argument("--lr", type=float, default=DEFAULT_LR)
    parser.add_argument("--weight-decay", type=float, default=DEFAULT_WEIGHT_DECAY)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--num-workers", type=int, default=DEFAULT_NUM_WORKERS)
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    parser.add_argument("--device", default="auto")
    parser.add_argument(
        "--pretrained",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Use ImageNet-pretrained ResNet18 weights. Disable with --no-pretrained.",
    )
    return parser


def build_infer_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Run timelapse inference with a trained bright-field ResNet checkpoint. "
            "Single-frame TIFFs are treated as a one-frame timelapse."
        )
    )
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("tif", type=Path)
    parser.add_argument("--channel", type=int, default=0)
    parser.add_argument("--channel-count", type=int, default=None)
    parser.add_argument("--output-csv", type=Path, default=None)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--threshold", type=float, default=None)
    parser.add_argument("--batch-size", type=int, default=64)
    return parser


def build_plot_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Plot a per-frame dead-probability score series from inference CSV output."
    )
    parser.add_argument("scores_csv", type=Path)
    parser.add_argument("--output-png", type=Path, default=None)
    parser.add_argument("--title", default=None)
    return parser


def build_events_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Score every ROI TIFF in a position folder and write one apoptosis-event "
            "timing row per ROI. Event timing is the first frame where dead_probability "
            "stays above threshold for --hold-frames frames."
        )
    )
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("roi_root", type=Path, help="Folder containing Roi*.tif and optional index.json.")
    parser.add_argument("--channel", type=int, default=0)
    parser.add_argument("--channel-count", type=int, default=None)
    parser.add_argument("--output-csv", type=Path, required=True)
    parser.add_argument(
        "--output-scores-csv",
        type=Path,
        default=None,
        help="Optional long-form per-frame scores CSV for all ROIs.",
    )
    parser.add_argument("--device", default="auto")
    parser.add_argument("--threshold", type=float, default=None)
    parser.add_argument("--hold-frames", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=64)
    return parser


def convert_dataset_main(argv: list[str] | None = None) -> None:
    args = build_convert_dataset_parser().parse_args(argv)
    input_root = args.input_root.resolve()
    output_root = args.output_root.resolve() if args.output_root is not None else default_output_root(input_root)
    summary = convert_dataset(input_root, output_root, position=args.position)
    print_summary(summary, output_root)


def train_main(argv: list[str] | None = None) -> None:
    args = build_train_parser().parse_args(argv)
    config = TrainingConfig(
        dataset_root=args.dataset_root.resolve(),
        artifact_root=args.artifact_root.resolve(),
        run_name=args.run_name,
        epochs=args.epochs,
        batch_size=args.batch_size,
        image_size=args.image_size,
        lr=args.lr,
        weight_decay=args.weight_decay,
        seed=args.seed,
        num_workers=args.num_workers,
        threshold=args.threshold,
        pretrained=args.pretrained,
        device=args.device,
    )
    artifacts = train_model(config)
    print(f"Run directory: {artifacts.run_dir}")
    print(f"Best checkpoint: {artifacts.best_checkpoint_path}")
    print(f"Last checkpoint: {artifacts.last_checkpoint_path}")
    print(f"Metrics CSV: {artifacts.metrics_csv_path}")
    print(f"Test metrics JSON: {artifacts.test_metrics_path}")


def infer_main(argv: list[str] | None = None) -> None:
    args = build_infer_parser().parse_args(argv)
    prediction = predict_timelapse(
        checkpoint_path=args.checkpoint,
        tif_path=args.tif,
        channel=args.channel,
        channel_count=args.channel_count,
        output_csv_path=args.output_csv,
        device=args.device,
        threshold=args.threshold,
        batch_size=args.batch_size,
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


def plot_main(argv: list[str] | None = None) -> None:
    args = build_plot_parser().parse_args(argv)
    output_path = plot_score_series(
        args.scores_csv,
        output_png_path=args.output_png,
        title=args.title,
    )
    print(f"Wrote plot: {output_path}")


def events_main(argv: list[str] | None = None) -> None:
    args = build_events_parser().parse_args(argv)
    result = run_batch_events(
        checkpoint_path=args.checkpoint,
        roi_root=args.roi_root,
        channel=args.channel,
        channel_count=args.channel_count,
        output_csv_path=args.output_csv,
        output_scores_csv_path=args.output_scores_csv,
        device=args.device,
        threshold=args.threshold,
        hold_frames=args.hold_frames,
        batch_size=args.batch_size,
    )
    detected_count = sum(1 for event in result.events if event.detected)
    print(f"Wrote event CSV: {result.events_csv_path}")
    if result.scores_csv_path is not None:
        print(f"Wrote scores CSV: {result.scores_csv_path}")
    print(f"Detected apoptosis events for {detected_count}/{len(result.events)} ROIs")
