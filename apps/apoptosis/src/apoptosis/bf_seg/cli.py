from __future__ import annotations

import argparse
from pathlib import Path

from .config import (
    DEFAULT_ARTIFACT_ROOT,
    DEFAULT_BATCH_SIZE,
    DEFAULT_DICE_WEIGHT,
    DEFAULT_EPOCHS,
    DEFAULT_IMAGE_SIZE,
    DEFAULT_LR_DECAY,
    DEFAULT_LR,
    DEFAULT_NUM_WORKERS,
    DEFAULT_SEED,
    DEFAULT_WEIGHT_DECAY,
    TrainingConfig,
)
from .dataset_conversion import convert_dataset, default_output_root, print_summary
from .inference import predict_timelapse
from .plotting import plot_readout_series
from .training import train_model


def build_convert_dataset_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Convert sparse ROI mask annotations into a semantic-segmentation dataset with "
            "annotated bright-field frames and 3-class masks."
        )
    )
    parser.add_argument(
        "--input-root",
        type=Path,
        required=True,
        help="Dataset root containing 'annotations/roi' and 'roi'.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
        help="Output dataset root. Default: <input-root>/bf_seg_dataset",
    )
    parser.add_argument(
        "--position",
        action="append",
        default=None,
        help="Optional position to convert. May be repeated. Default: convert every annotated position.",
    )
    return parser


def build_train_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Train a 3-class U-Net on bright-field segmentation masks from labels.csv."
    )
    parser.add_argument("--dataset-root", type=Path, required=True)
    parser.add_argument("--artifact-root", type=Path, default=DEFAULT_ARTIFACT_ROOT)
    parser.add_argument("--run-name", default=None)
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--image-size", type=int, default=DEFAULT_IMAGE_SIZE)
    parser.add_argument("--lr", type=float, default=DEFAULT_LR)
    parser.add_argument("--weight-decay", type=float, default=DEFAULT_WEIGHT_DECAY)
    parser.add_argument("--dice-weight", type=float, default=DEFAULT_DICE_WEIGHT)
    parser.add_argument(
        "--lr-decay",
        type=float,
        default=DEFAULT_LR_DECAY,
        help="Final LR as a fraction of the starting LR under cosine decay.",
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--num-workers", type=int, default=DEFAULT_NUM_WORKERS)
    parser.add_argument("--device", default="auto")
    return parser


def build_infer_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Run timelapse segmentation inference with a trained U-Net checkpoint and emit "
            "live-area readout metrics."
        )
    )
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("tif", type=Path)
    parser.add_argument("--channel", type=int, default=0)
    parser.add_argument("--channel-count", type=int, default=None)
    parser.add_argument("--output-csv", type=Path, default=None)
    parser.add_argument("--mask-stack", type=Path, default=None)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--batch-size", type=int, default=16)
    return parser


def build_plot_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Plot live-fraction and killing-efficiency curves from segmentation inference CSV."
    )
    parser.add_argument("readout_csv", type=Path)
    parser.add_argument("--output-png", type=Path, default=None)
    parser.add_argument("--title", default=None)
    return parser


def convert_dataset_main(argv: list[str] | None = None) -> None:
    args = build_convert_dataset_parser().parse_args(argv)
    input_root = args.input_root.resolve()
    output_root = args.output_root.resolve() if args.output_root is not None else default_output_root(input_root)
    summary = convert_dataset(input_root, output_root, positions=args.position)
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
        dice_weight=args.dice_weight,
        lr_decay=args.lr_decay,
        seed=args.seed,
        num_workers=args.num_workers,
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
        mask_stack_path=args.mask_stack,
        device=args.device,
        batch_size=args.batch_size,
    )
    live_fractions = [row.live_fraction for row in prediction.rows]
    print(f"Input TIFF: {prediction.input_path}")
    print(f"Checkpoint: {prediction.checkpoint_path}")
    print(f"Output CSV: {prediction.output_csv_path}")
    print(f"Frames scored: {prediction.frame_count}")
    if prediction.mask_stack_path is not None:
        print(f"Mask stack: {prediction.mask_stack_path}")
    print(f"Min live fraction: {min(live_fractions):.6f}")
    print(f"Max live fraction: {max(live_fractions):.6f}")
    print(f"Mean live fraction: {sum(live_fractions) / len(live_fractions):.6f}")


def plot_main(argv: list[str] | None = None) -> None:
    args = build_plot_parser().parse_args(argv)
    output_path = plot_readout_series(
        args.readout_csv,
        output_png_path=args.output_png,
        title=args.title,
    )
    print(f"Wrote plot: {output_path}")
