from __future__ import annotations

from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from transfection.core import (
    SlideChannelMapping,
    SlideMapping,
    compute_roi_mask_stack,
    default_mask_path,
    discover_roi_positions,
    load_assay_for_workspace,
    position_dir,
    read_position_index,
    validate_channel_index,
    write_mask_tif,
)
from transfection.core.parallel import worker_count



MaskWrittenCallback = Callable[[int, Path, int], None]


@dataclass(frozen=True)
class SlideSegmentationRunResult:
    written_outputs: list[tuple[int, Path, int]]
    skipped_positions: dict[int, list[int]]


def _run_position_segmentation(
    workspace: Path,
    *,
    slide_channel: int,
    segment_channel: int,
    resolved_pos: int,
    variation_radius: int,
    gaussian_sigma: float,
    force: bool,
) -> tuple[int, int, int, int, Path | None]:
    try:
        pos_dir = position_dir(workspace, resolved_pos)
    except ValueError:
        return (slide_channel, segment_channel, resolved_pos, 0, None)

    index = read_position_index(pos_dir)
    validate_channel_index(index, segment_channel)
    mask_count = 0
    first_output: Path | None = None

    for roi in index.rois:
        output_path = default_mask_path(
            workspace,
            position=index.position,
            slide_channel=slide_channel,
            mask_channel=segment_channel,
            roi_file_name=roi.file_name,
        )
        if output_path.exists() and not force:
            mask_count += 1
            if first_output is None:
                first_output = output_path
            continue

        mask_stack = compute_roi_mask_stack(
            pos_dir,
            index,
            roi,
            channel=segment_channel,
            variation_radius=variation_radius,
            gaussian_sigma=gaussian_sigma,
        )
        write_mask_tif(mask_stack, output_path)
        mask_count += 1
        if first_output is None:
            first_output = output_path

    return (slide_channel, segment_channel, resolved_pos, mask_count, first_output)


def _position_segmentation_task(
    payload: tuple[str, int, int, int, int, float, bool],
) -> tuple[int, int, int, int, Path | None]:
    workspace_str, slide_channel, segment_channel, resolved_pos, variation_radius, gaussian_sigma, force = payload
    return _run_position_segmentation(
        Path(workspace_str),
        slide_channel=slide_channel,
        segment_channel=segment_channel,
        resolved_pos=resolved_pos,
        variation_radius=variation_radius,
        gaussian_sigma=gaussian_sigma,
        force=force,
    )


def _position_tasks(
    workspace: Path,
    slide_positions: dict[int, SlideChannelMapping],
    *,
    variation_radius: int,
    gaussian_sigma: float,
    force: bool,
) -> list[tuple[str, int, int, int, int, float, bool]]:
    return [
        (
            str(workspace),
            slide_channel,
            entry.mask_channel,
            resolved_pos,
            variation_radius,
            gaussian_sigma,
            force,
        )
        for slide_channel, entry in slide_positions.items()
        for resolved_pos in entry.positions
    ]


def run_slide_segmentation(
    workspace: Path,
    *,
    mapping: SlideMapping | None,
    mask_channel: int | None = None,
    variation_radius: int = 2,
    gaussian_sigma: float = 1.0,
    force: bool = False,
    on_mask_written: MaskWrittenCallback | None = None,
) -> SlideSegmentationRunResult:
    if variation_radius < 0:
        raise ValueError(f"--variation-radius must be >= 0, got {variation_radius}")
    if gaussian_sigma < 0:
        raise ValueError(f"--gaussian-sigma must be >= 0, got {gaussian_sigma}")

    workspace = workspace.resolve()
    if mapping:
        slide_positions = mapping
    else:
        if mask_channel is None:
            mask_channel = load_assay_for_workspace(workspace).mask_channel
        positions = discover_roi_positions(workspace)
        slide_positions = {
            0: SlideChannelMapping(
                positions=positions,
                signal_channels=[0],
                mask_channel=mask_channel,
                sample_name="",
            )
        }
    channel_order = [slide_channel for slide_channel, _ in slide_positions.items()]
    tasks = _position_tasks(
        workspace,
        slide_positions,
        variation_radius=variation_radius,
        gaussian_sigma=gaussian_sigma,
        force=force,
    )
    if not tasks:
        raise ValueError("assay mapping defines no valid positions")

    skipped_positions: dict[int, list[int]] = defaultdict(list)
    written_by_channel: dict[int, tuple[Path, int]] = {}

    def consume(row: tuple[int, int, int, int, Path | None]) -> None:
        slide_channel, _mask_channel, resolved_pos, written_count, first_output = row
        if first_output is None:
            skipped_positions.setdefault(slide_channel, []).append(resolved_pos)
            return
        current_output, current_count = written_by_channel.get(slide_channel, (first_output, 0))
        written_by_channel[slide_channel] = (current_output, current_count + written_count)

    max_workers = worker_count(len(tasks))
    if max_workers == 1:
        for task in tasks:
            consume(_position_segmentation_task(task))
    else:
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(_position_segmentation_task, task) for task in tasks]
            for future in as_completed(futures):
                consume(future.result())

    written_outputs: list[tuple[int, Path, int]] = []
    for slide_channel in channel_order:
        if slide_channel not in written_by_channel:
            continue
        first_output, mask_count = written_by_channel[slide_channel]
        written_outputs.append((slide_channel, first_output.parent, mask_count))
        if on_mask_written is not None:
            on_mask_written(slide_channel, first_output.parent, mask_count)

    if not written_outputs:
        if skipped_positions:
            skipped_summary = "; ".join(
                f"slide channel {slide_channel} -> {', '.join(str(pos) for pos in positions)}"
                for slide_channel, positions in sorted(skipped_positions.items())
            )
            raise ValueError(
                f"No ROI directories found for positions in assay mapping. "
                f"Skipped positions: {skipped_summary}"
            )
        raise ValueError("assay mapping defines no valid positions")

    return SlideSegmentationRunResult(
        written_outputs=written_outputs,
        skipped_positions=skipped_positions,
    )


def format_written_masks_message(slide_channel: int, output_dir: Path, mask_count: int) -> str:
    noun = "mask" if mask_count == 1 else "masks"
    return f"Prepared {mask_count} {noun} for slide channel {slide_channel} under: {output_dir}"


def format_skipped_positions_message(skipped_positions: dict[int, list[int]]) -> str:
    total_skipped_positions = sum(len(positions) for positions in skipped_positions.values())
    skipped_summary = "; ".join(
        f"slide channel {slide_channel} -> {', '.join(str(pos) for pos in positions)}"
        for slide_channel, positions in sorted(skipped_positions.items())
    )
    return f"Skipped {total_skipped_positions} missing positions from slide mapping: {skipped_summary}"


def run_segment(
    *,
    workspace: Path,
    assay: Path | None = None,
    mapping: SlideMapping | None = None,
    variation_radius: int = 2,
    gaussian_sigma: float = 1.0,
    force: bool = False,
    on_mask_written: MaskWrittenCallback | None = None,
) -> SlideSegmentationRunResult:
    config = load_assay_for_workspace(workspace, assay)
    if mapping is None:
        mapping = config.mapping or None
    return run_slide_segmentation(
        workspace,
        mapping=mapping,
        mask_channel=config.mask_channel,
        variation_radius=variation_radius,
        gaussian_sigma=gaussian_sigma,
        force=force,
        on_mask_written=on_mask_written,
    )
