from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

import torch
from torch import nn

from .config import (
    DEFAULT_THRESHOLD,
    PredictionResult,
    TimelapsePredictionResult,
    TimelapsePredictionRow,
)
from .model import (
    build_model,
    choose_device,
    default_scores_csv_path,
    extract_timelapse_frames,
    preprocess_image_array,
)


def load_checkpoint(checkpoint_path: Path, device: torch.device) -> tuple[nn.Module, dict[str, Any]]:
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    config = checkpoint["config"]
    model = build_model(pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    return model, config


@torch.inference_mode()
def predict_timelapse(
    checkpoint_path: Path,
    tif_path: Path,
    *,
    channel: int = 0,
    channel_count: int | None = None,
    output_csv_path: Path | None = None,
    device: str = "auto",
    threshold: float | None = None,
    batch_size: int = 64,
) -> TimelapsePredictionResult:
    resolved_tif_path = tif_path.resolve()
    resolved_checkpoint_path = checkpoint_path.resolve()
    resolved_output_csv_path = (
        output_csv_path.resolve()
        if output_csv_path is not None
        else default_scores_csv_path(resolved_tif_path, channel)
    )
    resolved_device = choose_device(device)
    model, config = load_checkpoint(resolved_checkpoint_path, device=resolved_device)
    image_size = int(config["image_size"])
    decision_threshold = float(threshold if threshold is not None else config.get("threshold", DEFAULT_THRESHOLD))
    frames = extract_timelapse_frames(
        resolved_tif_path,
        channel=channel,
        channel_count=channel_count,
    )

    rows: list[TimelapsePredictionRow] = []
    for batch_start in range(0, frames.shape[0], batch_size):
        batch_frames = frames[batch_start : batch_start + batch_size]
        batch_tensor = torch.stack(
            [preprocess_image_array(frame, image_size=image_size) for frame in batch_frames],
            dim=0,
        ).to(resolved_device)
        batch_probabilities = torch.sigmoid(model(batch_tensor).squeeze(1)).cpu().tolist()
        for frame_offset, probability in enumerate(batch_probabilities):
            time_index = batch_start + frame_offset
            hard_label = "dead" if float(probability) >= decision_threshold else "live"
            rows.append(
                TimelapsePredictionRow(
                    time_index=time_index,
                    dead_probability=float(probability),
                    hard_label=hard_label,
                )
            )

    resolved_output_csv_path.parent.mkdir(parents=True, exist_ok=True)
    with resolved_output_csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["time_index", "dead_probability", "predicted_label", "input_tif", "channel"],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "time_index": row.time_index,
                    "dead_probability": f"{row.dead_probability:.6f}",
                    "predicted_label": row.hard_label,
                    "input_tif": str(resolved_tif_path),
                    "channel": channel,
                }
            )

    return TimelapsePredictionResult(
        input_path=resolved_tif_path,
        checkpoint_path=resolved_checkpoint_path,
        output_csv_path=resolved_output_csv_path,
        channel=channel,
        frame_count=len(rows),
        threshold=decision_threshold,
        rows=rows,
    )


@torch.inference_mode()
def predict_single_image(
    checkpoint_path: Path,
    image_path: Path,
    *,
    device: str = "auto",
    threshold: float | None = None,
) -> PredictionResult:
    timelapse_prediction = predict_timelapse(
        checkpoint_path=checkpoint_path,
        tif_path=image_path,
        channel=0,
        channel_count=1,
        device=device,
        threshold=threshold,
    )
    if timelapse_prediction.frame_count != 1:
        raise ValueError(
            f"{image_path} produced {timelapse_prediction.frame_count} frames; "
            "use predict_timelapse for multi-frame TIFFs."
        )
    row = timelapse_prediction.rows[0]
    return PredictionResult(
        image_path=timelapse_prediction.input_path,
        dead_probability=row.dead_probability,
        hard_label=row.hard_label,
        checkpoint_path=timelapse_prediction.checkpoint_path,
        threshold=timelapse_prediction.threshold,
    )
