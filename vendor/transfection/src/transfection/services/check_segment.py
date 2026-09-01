from __future__ import annotations

from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import imageio.v2 as imageio
import numpy as np

from transfection.core import (
    RoiCrop,
    SlideMapping,
    default_mask_path,
    load_assay_for_workspace,
    position_dir,
    read_mask_stack,
    read_position_index,
    read_roi_stack,
    roi_frame_2d,
    validate_channel_index,
)
from transfection.core.parallel import worker_count
from transfection.services.segment import format_skipped_positions_message


REVIEW_FRAME_SIZE = 512

VideoWrittenCallback = Callable[["CheckSegmentVideo"], None]


@dataclass(frozen=True)
class CheckSegmentVideo:
    output_path: Path
    frame_count: int


@dataclass(frozen=True)
class CheckSegmentRunResult:
    videos: list[CheckSegmentVideo]
    skipped_positions: dict[int, list[int]]


def default_output_dir(workspace: Path) -> Path:
    return (workspace.resolve() / "check-segment").resolve()


def default_video_path(output_dir: Path, *, position: int, roi: RoiCrop, channel: int) -> Path:
    return (output_dir / f"Pos{position}" / f"{Path(roi.file_name).stem}_ch{channel}.mp4").resolve()


def _normalization_bounds(frames: np.ndarray) -> tuple[float, float]:
    values = frames[np.isfinite(frames)].astype(np.float64, copy=False)
    if values.size == 0:
        return (0.0, 1.0)
    low, high = np.percentile(values, [1.0, 99.0])
    low_f, high_f = float(low), float(high)
    if low_f < high_f:
        return (low_f, high_f)
    return (low_f, low_f + 1.0)


def normalize_frame_to_rgb8(frame: np.ndarray, *, low: float, high: float) -> np.ndarray:
    scaled = (frame.astype(np.float64, copy=False) - low) / (high - low)
    gray = np.clip(scaled * 255.0, 0.0, 255.0).astype(np.uint8)
    return np.repeat(gray[:, :, np.newaxis], 3, axis=2)


def resize_nearest(image: np.ndarray, *, height: int, width: int) -> np.ndarray:
    if height < 1 or width < 1:
        raise ValueError(f"Resize target must be positive, got {height}x{width}")
    source_height, source_width = image.shape[:2]
    y_index = np.rint(np.linspace(0, source_height - 1, height)).astype(np.intp)
    x_index = np.rint(np.linspace(0, source_width - 1, width)).astype(np.intp)
    return image[y_index[:, np.newaxis], x_index]


def fit_to_square_canvas(image: np.ndarray, *, size: int = REVIEW_FRAME_SIZE) -> np.ndarray:
    source_height, source_width = image.shape[:2]
    scale = min(size / float(source_height), size / float(source_width))
    target_height = max(1, int(round(source_height * scale)))
    target_width = max(1, int(round(source_width * scale)))
    resized = resize_nearest(image, height=target_height, width=target_width)

    if image.ndim == 2:
        canvas = np.zeros((size, size), dtype=image.dtype)
        y0 = (size - target_height) // 2
        x0 = (size - target_width) // 2
        canvas[y0 : y0 + target_height, x0 : x0 + target_width] = resized
        return canvas

    canvas = np.zeros((size, size, image.shape[2]), dtype=image.dtype)
    y0 = (size - target_height) // 2
    x0 = (size - target_width) // 2
    canvas[y0 : y0 + target_height, x0 : x0 + target_width, :] = resized
    return canvas


def mask_contour(mask: np.ndarray) -> np.ndarray:
    mask_bool = np.asarray(mask, dtype=bool)
    if mask_bool.ndim != 2:
        raise ValueError(f"Expected a 2D mask, got shape={mask_bool.shape}")

    interior = mask_bool.copy()
    interior[1:, :] &= mask_bool[:-1, :]
    interior[:-1, :] &= mask_bool[1:, :]
    interior[:, 1:] &= mask_bool[:, :-1]
    interior[:, :-1] &= mask_bool[:, 1:]
    return mask_bool & ~interior


def dilate_2d(mask: np.ndarray) -> np.ndarray:
    mask_bool = np.asarray(mask, dtype=bool)
    dilated = mask_bool.copy()
    dilated[1:, :] |= mask_bool[:-1, :]
    dilated[:-1, :] |= mask_bool[1:, :]
    dilated[:, 1:] |= mask_bool[:, :-1]
    dilated[:, :-1] |= mask_bool[:, 1:]
    return dilated


def overlay_contour(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    frame = rgb.copy()
    contour = dilate_2d(mask_contour(mask))
    frame[contour] = np.array([255, 0, 0], dtype=np.uint8)
    return frame


def pad_to_even_dimensions(rgb: np.ndarray) -> np.ndarray:
    height, width = rgb.shape[:2]
    pad_height = height % 2
    pad_width = width % 2
    if pad_height == 0 and pad_width == 0:
        return rgb
    return np.pad(rgb, ((0, pad_height), (0, pad_width), (0, 0)), mode="edge")


def review_frame(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    fitted_rgb = fit_to_square_canvas(rgb, size=REVIEW_FRAME_SIZE)
    fitted_mask = fit_to_square_canvas(mask.astype(np.uint8), size=REVIEW_FRAME_SIZE) > 0
    return overlay_contour(fitted_rgb, fitted_mask)


def roi_channel_frames(pos_dir: Path, index, roi: RoiCrop, *, channel: int) -> np.ndarray:
    stack = read_roi_stack(pos_dir / roi.file_name, roi.shape)
    frames = [
        np.asarray(
            roi_frame_2d(stack, index.axis_order, timepoint=timepoint, channel=channel),
            dtype=np.float64,
        )
        for timepoint in range(index.time_count)
    ]
    return np.stack(frames, axis=0)


def _review_channels(*, mask_channel: int, signal_channel: int) -> list[int]:
    return sorted({mask_channel, signal_channel})


def write_check_segment_video(
    *,
    output_dir: Path,
    position: int,
    pos_dir: Path,
    index,
    roi: RoiCrop,
    source_channel: int,
    mask_stack: np.ndarray,
    fps: float,
    force: bool,
) -> CheckSegmentVideo:
    validate_channel_index(index, source_channel)
    output_path = default_video_path(output_dir, position=position, roi=roi, channel=source_channel)
    if output_path.exists() and not force:
        return CheckSegmentVideo(output_path=output_path, frame_count=index.time_count)

    frames = roi_channel_frames(pos_dir, index, roi, channel=source_channel)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    low, high = _normalization_bounds(frames)
    with imageio.get_writer(output_path, fps=fps, codec="libx264", macro_block_size=1) as writer:
        for frame, mask in zip(frames, mask_stack, strict=True):
            rgb = normalize_frame_to_rgb8(frame, low=low, high=high)
            writer.append_data(pad_to_even_dimensions(review_frame(rgb, mask)))

    return CheckSegmentVideo(output_path=output_path, frame_count=index.time_count)


def _run_position_check_segment(
    workspace: Path,
    *,
    slide_channel: int,
    mask_channel: int,
    signal_channel: int,
    resolved_pos: int,
    output_dir: Path,
    fps: float,
    force: bool,
) -> tuple[int, int, list[CheckSegmentVideo] | None]:
    try:
        pos_dir = position_dir(workspace, resolved_pos)
    except ValueError:
        return (slide_channel, resolved_pos, None)

    index = read_position_index(pos_dir)
    validate_channel_index(index, mask_channel)
    review_channels = _review_channels(mask_channel=mask_channel, signal_channel=signal_channel)
    videos: list[CheckSegmentVideo] = []
    for roi in index.rois:
        mask_reference_frames = roi_channel_frames(pos_dir, index, roi, channel=mask_channel)
        mask_path = default_mask_path(
            workspace,
            position=index.position,
            slide_channel=slide_channel,
            mask_channel=mask_channel,
            roi_file_name=roi.file_name,
        )
        mask_stack = read_mask_stack(
            mask_path,
            time_count=index.time_count,
            frame_shape=tuple(int(value) for value in mask_reference_frames[0].shape),
        )
        for channel in review_channels:
            videos.append(
                write_check_segment_video(
                    output_dir=output_dir,
                    position=position,
                    pos_dir=pos_dir,
                    index=index,
                    roi=roi,
                    source_channel=channel,
                    mask_stack=mask_stack,
                    fps=fps,
                    force=force,
                )
            )
    return (slide_channel, resolved_pos, videos)


def _position_check_segment_task(
    payload: tuple[str, int, int, int, int, str, float, bool],
) -> tuple[int, int, list[CheckSegmentVideo] | None]:
    (
        workspace_str,
        slide_channel,
        mask_channel,
        signal_channel,
        resolved_pos,
        output_dir_str,
        fps,
        force,
    ) = payload
    return _run_position_check_segment(
        Path(workspace_str),
        slide_channel=slide_channel,
        mask_channel=mask_channel,
        signal_channel=signal_channel,
        resolved_pos=resolved_pos,
        output_dir=Path(output_dir_str),
        fps=fps,
        force=force,
    )


def _position_tasks(
    workspace: Path,
    slide_positions: SlideMapping,
    *,
    output_dir: Path,
    fps: float,
    force: bool,
) -> list[tuple[str, int, int, int, int, str, float, bool]]:
    return [
        (
            str(workspace),
            slide_channel,
            entry.mask_channel,
            signal_channel,
            resolved_pos,
            str(output_dir),
            fps,
            force,
        )
        for slide_channel, entry in slide_positions.items()
        for signal_channel in entry.signal_channels
        for resolved_pos in entry.positions
    ]


def format_written_check_segment_video_message(video: CheckSegmentVideo) -> str:
    return f"Wrote check video ({video.frame_count} frames): {video.output_path}"


def run_check_segment(
    *,
    workspace: Path,
    assay: Path | None = None,
    mapping: SlideMapping | None = None,
    output: Path | None = None,
    fps: float = 6.0,
    force: bool = False,
    on_video_written: VideoWrittenCallback | None = None,
) -> CheckSegmentRunResult:
    if fps <= 0:
        raise ValueError(f"--fps must be > 0, got {fps}")

    workspace = workspace.resolve()
    output_dir = default_output_dir(workspace) if output is None else output.resolve()
    if mapping is None:
        mapping = load_assay_for_workspace(workspace, assay).mapping
    slide_positions = mapping
    tasks = _position_tasks(
        workspace,
        slide_positions,
        output_dir=output_dir,
        fps=fps,
        force=force,
    )
    if not tasks:
        raise ValueError("assay mapping defines no valid positions")

    skipped_positions: dict[int, list[int]] = defaultdict(list)
    videos: list[CheckSegmentVideo] = []

    def consume(row: tuple[int, int, list[CheckSegmentVideo] | None]) -> None:
        slide_channel, resolved_pos, position_videos = row
        if position_videos is None:
            skipped_positions.setdefault(slide_channel, []).append(resolved_pos)
            return
        videos.extend(position_videos)
        if on_video_written is not None:
            for video in position_videos:
                on_video_written(video)

    max_workers = worker_count(len(tasks))
    if max_workers == 1:
        for task in tasks:
            consume(_position_check_segment_task(task))
    else:
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(_position_check_segment_task, task) for task in tasks]
            for future in as_completed(futures):
                consume(future.result())

    if not videos:
        if skipped_positions:
            skipped_summary = "; ".join(
                f"slide channel {slide_channel} -> {', '.join(str(pos) for pos in positions)}"
                for slide_channel, positions in sorted(skipped_positions.items())
            )
            raise ValueError(
                f"No check-segment videos produced for positions in assay mapping. "
                f"Skipped positions: {skipped_summary}"
            )
        raise ValueError("No check-segment videos produced")

    return CheckSegmentRunResult(videos=videos, skipped_positions=skipped_positions)


__all__ = [
    "CheckSegmentRunResult",
    "CheckSegmentVideo",
    "default_output_dir",
    "format_skipped_positions_message",
    "format_written_check_segment_video_message",
    "run_check_segment",
]
