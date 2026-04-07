from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

import numpy as np
import tifffile
import torch
from torch import nn
from torch.nn import functional as F

from .config import NUM_CLASSES, TimelapseInferenceResult, TimelapseReadoutRow
from .model import (
    build_model,
    choose_device,
    default_readout_csv_path,
    extract_timelapse_frames,
    preprocess_image_array,
)


def load_checkpoint(checkpoint_path: Path, device: torch.device) -> tuple[nn.Module, dict[str, Any], torch.Tensor]:
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model = build_model()
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    class_weights = checkpoint.get("class_weights", torch.ones(NUM_CLASSES, dtype=torch.float32))
    return model, checkpoint["config"], class_weights


@torch.inference_mode()
def predict_timelapse(
    checkpoint_path: Path,
    tif_path: Path,
    *,
    channel: int = 0,
    channel_count: int | None = None,
    output_csv_path: Path | None = None,
    mask_stack_path: Path | None = None,
    device: str = "auto",
    batch_size: int = 16,
) -> TimelapseInferenceResult:
    resolved_tif_path = tif_path.resolve()
    resolved_checkpoint_path = checkpoint_path.resolve()
    resolved_output_csv_path = (
        output_csv_path.resolve()
        if output_csv_path is not None
        else default_readout_csv_path(resolved_tif_path)
    )
    resolved_mask_stack_path = mask_stack_path.resolve() if mask_stack_path is not None else None
    resolved_device = choose_device(device)
    model, config, _class_weights = load_checkpoint(resolved_checkpoint_path, device=resolved_device)
    image_size = int(config["image_size"])
    frames = extract_timelapse_frames(
        resolved_tif_path,
        channel=channel,
        channel_count=channel_count,
    )
    original_height, original_width = int(frames.shape[1]), int(frames.shape[2])

    rows: list[TimelapseReadoutRow] = []
    predicted_masks: list[np.ndarray] = []
    for batch_start in range(0, frames.shape[0], batch_size):
        batch_frames = frames[batch_start : batch_start + batch_size]
        batch_tensor = torch.stack(
            [preprocess_image_array(frame, image_size=image_size) for frame in batch_frames],
            dim=0,
        ).to(resolved_device)
        logits = model(batch_tensor)
        logits = F.interpolate(
            logits,
            size=(original_height, original_width),
            mode="bilinear",
            align_corners=False,
        )
        predictions = logits.argmax(dim=1).cpu().numpy().astype(np.uint8)
        predicted_masks.extend(predictions)
        for frame_offset, prediction in enumerate(predictions):
            time_index = batch_start + frame_offset
            counts = np.bincount(prediction.reshape(-1), minlength=NUM_CLASSES)
            total_px = int(counts.sum())
            live_area_px = int(counts[1])
            live_fraction = 0.0 if total_px == 0 else live_area_px / total_px
            rows.append(
                TimelapseReadoutRow(
                    time_index=time_index,
                    background_px=int(counts[0]),
                    live_px=int(counts[1]),
                    dead_px=int(counts[2]),
                    total_px=total_px,
                    live_area_px=live_area_px,
                    live_fraction=live_fraction,
                    killing_efficiency=1.0 - live_fraction,
                )
            )

    resolved_output_csv_path.parent.mkdir(parents=True, exist_ok=True)
    with resolved_output_csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "time_index",
                "background_px",
                "live_px",
                "dead_px",
                "total_px",
                "live_area_px",
                "live_fraction",
                "killing_efficiency",
                "input_tif",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "time_index": row.time_index,
                    "background_px": row.background_px,
                    "live_px": row.live_px,
                    "dead_px": row.dead_px,
                    "total_px": row.total_px,
                    "live_area_px": row.live_area_px,
                    "live_fraction": f"{row.live_fraction:.6f}",
                    "killing_efficiency": f"{row.killing_efficiency:.6f}",
                    "input_tif": str(resolved_tif_path),
                }
            )

    if resolved_mask_stack_path is not None:
        resolved_mask_stack_path.parent.mkdir(parents=True, exist_ok=True)
        tifffile.imwrite(resolved_mask_stack_path, np.stack(predicted_masks, axis=0).astype(np.uint8))

    return TimelapseInferenceResult(
        input_path=resolved_tif_path,
        checkpoint_path=resolved_checkpoint_path,
        output_csv_path=resolved_output_csv_path,
        frame_count=len(rows),
        rows=rows,
        mask_stack_path=resolved_mask_stack_path,
    )
