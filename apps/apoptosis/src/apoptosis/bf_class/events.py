from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import torch

from .config import DEFAULT_THRESHOLD, TimelapsePredictionRow
from .inference import load_checkpoint
from .model import choose_device, extract_timelapse_frames, preprocess_image_array


ROI_FILE_RE = re.compile(r"^Roi(?P<roi>\d+)\.tif$", re.IGNORECASE)


@dataclass(frozen=True)
class RoiTimelapse:
    roi: int
    tif_path: Path


@dataclass(frozen=True)
class RoiEventResult:
    roi: int
    detected: bool
    event_t: int | None
    event_probability: float | None
    threshold: float
    hold_frames: int
    last_t: int
    input_tif: Path


@dataclass(frozen=True)
class BatchEventResult:
    events_csv_path: Path
    scores_csv_path: Path | None
    events: list[RoiEventResult]


def _roi_sort_key(item: RoiTimelapse) -> tuple[int, str]:
    return item.roi, item.tif_path.name


def discover_roi_timelapses(roi_root: Path) -> list[RoiTimelapse]:
    roi_root = roi_root.resolve()
    index_path = roi_root / "index.json"
    timelapses: list[RoiTimelapse] = []
    if index_path.exists():
        payload: dict[str, Any] = json.loads(index_path.read_text(encoding="utf-8"))
        for roi_entry in payload.get("rois", []):
            tif_path = roi_root / str(roi_entry["fileName"])
            if tif_path.exists():
                timelapses.append(RoiTimelapse(roi=int(roi_entry["roi"]), tif_path=tif_path))
        return sorted(timelapses, key=_roi_sort_key)

    for tif_path in roi_root.glob("Roi*.tif"):
        match = ROI_FILE_RE.match(tif_path.name)
        if match is None:
            continue
        timelapses.append(RoiTimelapse(roi=int(match.group("roi")), tif_path=tif_path))
    return sorted(timelapses, key=_roi_sort_key)


def first_sustained_crossing(rows: list[TimelapsePredictionRow], *, threshold: float, hold_frames: int) -> int | None:
    if hold_frames < 1:
        raise ValueError(f"--hold-frames must be >= 1, got {hold_frames}")

    run_length = 0
    for idx, row in enumerate(rows):
        run_length = run_length + 1 if row.dead_probability >= threshold else 0
        if run_length >= hold_frames:
            return idx - hold_frames + 1
    return None


def detect_event(
    roi: int,
    tif_path: Path,
    rows: list[TimelapsePredictionRow],
    *,
    threshold: float,
    hold_frames: int,
) -> RoiEventResult:
    if not rows:
        raise ValueError(f"No prediction rows for ROI {roi}")

    event_idx = first_sustained_crossing(rows, threshold=threshold, hold_frames=hold_frames)
    event_row = rows[event_idx] if event_idx is not None else None
    last_t = int(rows[-1].time_index)
    return RoiEventResult(
        roi=roi,
        detected=event_row is not None,
        event_t=int(event_row.time_index) if event_row is not None else None,
        event_probability=float(event_row.dead_probability) if event_row is not None else None,
        threshold=float(threshold),
        hold_frames=hold_frames,
        last_t=last_t,
        input_tif=tif_path.resolve(),
    )


def predict_rows_for_tif(
    model: torch.nn.Module,
    tif_path: Path,
    *,
    image_size: int,
    channel: int,
    channel_count: int | None,
    device: torch.device,
    threshold: float,
    batch_size: int,
) -> list[TimelapsePredictionRow]:
    frames = extract_timelapse_frames(tif_path, channel=channel, channel_count=channel_count)

    rows: list[TimelapsePredictionRow] = []
    for batch_start in range(0, frames.shape[0], batch_size):
        batch_frames = frames[batch_start : batch_start + batch_size]
        batch_tensor = torch.stack(
            [preprocess_image_array(frame, image_size=image_size) for frame in batch_frames],
            dim=0,
        ).to(device)
        batch_probabilities = torch.sigmoid(model(batch_tensor).squeeze(1)).cpu().tolist()
        for frame_offset, probability in enumerate(batch_probabilities):
            time_index = batch_start + frame_offset
            hard_label = "dead" if float(probability) >= threshold else "live"
            rows.append(
                TimelapsePredictionRow(
                    time_index=time_index,
                    dead_probability=float(probability),
                    hard_label=hard_label,
                )
            )
    return rows


def write_events_csv(events: list[RoiEventResult], output_csv: Path) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "roi",
                "detected",
                "event_t",
                "event_probability",
                "threshold",
                "hold_frames",
                "last_t",
                "input_tif",
            ],
        )
        writer.writeheader()
        for event in events:
            writer.writerow(
                {
                    "roi": event.roi,
                    "detected": event.detected,
                    "event_t": "" if event.event_t is None else event.event_t,
                    "event_probability": (
                        "" if event.event_probability is None else f"{event.event_probability:.6f}"
                    ),
                    "threshold": f"{event.threshold:.6f}",
                    "hold_frames": event.hold_frames,
                    "last_t": event.last_t,
                    "input_tif": str(event.input_tif),
                }
            )


def write_scores_csv(
    score_rows: list[dict[str, int | float | str]],
    output_csv: Path,
) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "roi",
                "time_index",
                "dead_probability",
                "predicted_label",
                "input_tif",
                "channel",
            ],
        )
        writer.writeheader()
        for row in score_rows:
            writer.writerow(row)


@torch.inference_mode()
def run_batch_events(
    checkpoint_path: Path,
    roi_root: Path,
    *,
    channel: int = 0,
    channel_count: int | None = None,
    output_csv_path: Path,
    output_scores_csv_path: Path | None = None,
    device: str = "auto",
    threshold: float | None = None,
    hold_frames: int = 1,
    batch_size: int = 64,
) -> BatchEventResult:
    roi_timelapses = discover_roi_timelapses(roi_root)
    if not roi_timelapses:
        raise ValueError(f"No Roi*.tif timelapses found in {roi_root}")

    resolved_device = choose_device(device)
    model, config = load_checkpoint(checkpoint_path.resolve(), device=resolved_device)
    image_size = int(config["image_size"])
    decision_threshold = float(threshold if threshold is not None else config.get("threshold", DEFAULT_THRESHOLD))

    events: list[RoiEventResult] = []
    score_rows: list[dict[str, int | float | str]] = []
    for timelapse in roi_timelapses:
        rows = predict_rows_for_tif(
            model,
            timelapse.tif_path,
            image_size=image_size,
            channel=channel,
            channel_count=channel_count,
            device=resolved_device,
            threshold=decision_threshold,
            batch_size=batch_size,
        )
        events.append(
            detect_event(
                timelapse.roi,
                timelapse.tif_path,
                rows,
                threshold=decision_threshold,
                hold_frames=hold_frames,
            )
        )
        if output_scores_csv_path is not None:
            for row in rows:
                score_rows.append(
                    {
                        "roi": timelapse.roi,
                        "time_index": row.time_index,
                        "dead_probability": f"{row.dead_probability:.6f}",
                        "predicted_label": row.hard_label,
                        "input_tif": str(timelapse.tif_path.resolve()),
                        "channel": channel,
                    }
                )

    write_events_csv(events, output_csv_path.resolve())
    if output_scores_csv_path is not None:
        write_scores_csv(score_rows, output_scores_csv_path.resolve())

    return BatchEventResult(
        events_csv_path=output_csv_path.resolve(),
        scores_csv_path=output_scores_csv_path.resolve() if output_scores_csv_path is not None else None,
        events=events,
    )
