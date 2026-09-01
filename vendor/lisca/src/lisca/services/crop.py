from __future__ import annotations

import errno
import json
import os
import shutil
import threading
from collections import deque
from collections.abc import Callable, Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from uuid import uuid4

import numpy as np
import tifffile

from lisca.core.bbox import (
    RoiBbox,
    discover_bbox_positions,
    parse_bbox_csv,
    validate_bboxes,
    workspace_bbox_csv_path,
    workspace_roi_pos_dir,
)
from lisca.core.paths import INDEX_JSON
from lisca.migrations import migrate_workspace
from lisca.readers import ImageInfo, open_reader

try:
    import resource as _resource_mod
except ImportError:  # pragma: no cover - Windows
    resource: ModuleType | None = None
else:
    resource = _resource_mod

ProgressCallback = Callable[[str], None]

# Extra position workers each open another ND2/CZI reader on the same file
# and contend for seeks (especially JupyterHub NFS). Default is one worker;
# LISCA_CROP_WORKERS opts into parallelism but is an upper bound, not a
# guarantee — the FD budget can still shrink the request.
_FD_HEADROOM = 256
_MIN_FD_BUDGET = 64


@dataclass(frozen=True)
class CropPositionResult:
    pos: int
    output_dir: Path
    roi_count: int


@dataclass(frozen=True)
class CropRunResult:
    written: list[CropPositionResult]
    skipped_missing_bbox: list[int]


def crop_fd_budget(soft_limit: int | None = None) -> int:
    """FDs available for crop readers/writers after leaving Python/ND2 headroom.

    ``budget = max(64, soft_limit - 256)``. Queries
    ``resource.getrlimit(RLIMIT_NOFILE)`` when ``soft_limit`` is omitted.
    """
    if soft_limit is None:
        if resource is None:
            return 2**20
        try:
            soft_limit, _hard = resource.getrlimit(resource.RLIMIT_NOFILE)
        except (OSError, ValueError):
            return 2**20
    if soft_limit <= 0:
        return 2**20
    infinity = (
        getattr(resource, "RLIM_INFINITY", None) if resource is not None else None
    )
    if infinity is not None and infinity > 0 and soft_limit == infinity:
        return 2**20
    if soft_limit > 10**9:
        return 2**20
    return max(_MIN_FD_BUDGET, int(soft_limit) - _FD_HEADROOM)


def crop_position_worker_count(
    position_count: int,
    *,
    max_roi_count: int = 0,
    fd_budget: int | None = None,
) -> int:
    """Choose parallel position workers.

    Default is 1: extra workers each open another reader on the same ND2/CZI
    and mostly fight for seeks. Set ``LISCA_CROP_WORKERS`` to a positive
    integer to opt into parallelism (still limited by ``position_count``).
    The env var is an upper bound, not a guarantee: workers also shrink to
    ``budget // (max_roi_count + 1)`` so ``workers * (n_roi + 1)`` stays
    within the FD budget.
    """
    requested = 1
    raw = os.environ.get("LISCA_CROP_WORKERS", "").strip()
    if raw:
        try:
            parsed = int(raw)
        except ValueError:
            parsed = 0
        if parsed > 0:
            requested = parsed
    requested = max(1, min(position_count, requested))
    budget = crop_fd_budget() if fd_budget is None else fd_budget
    fd_capped = budget // (max(0, max_roi_count) + 1)
    return max(1, min(requested, fd_capped))


def _crop_frame(frame: np.ndarray, bbox: RoiBbox) -> np.ndarray:
    array = np.asarray(frame)
    if array.ndim != 2:
        raise ValueError(f"Expected 2D frame for crop, got shape {array.shape}")
    return np.ascontiguousarray(
        array[bbox.y : bbox.y + bbox.h, bbox.x : bbox.x + bbox.w]
    )


def _write_index(
    *,
    output_dir: Path,
    pos: int,
    time_count: int,
    channel_count: int,
    z_count: int,
    bboxes: list[RoiBbox],
    time_indices: list[int] | None = None,
) -> None:
    resolved_times = (
        list(time_indices) if time_indices is not None else list(range(time_count))
    )
    if len(resolved_times) != time_count:
        raise ValueError(
            f"timeIndices length {len(resolved_times)} does not match "
            f"timeCount {time_count}"
        )
    index = {
        "position": pos,
        "axisOrder": "TCZYX",
        "timeCount": time_count,
        "channelCount": channel_count,
        "zCount": z_count,
        # Source acquisition indices for each T plane (may skip frames).
        "timeIndices": resolved_times,
        "rois": [
            {
                "roi": bbox.roi,
                "fileName": f"Roi{bbox.roi}.tif",
                "bbox": {
                    "roi": bbox.roi,
                    "x": bbox.x,
                    "y": bbox.y,
                    "w": bbox.w,
                    "h": bbox.h,
                },
            }
            for bbox in bboxes
        ],
    }
    (output_dir / INDEX_JSON).write_text(
        json.dumps(index, indent=2) + "\n", encoding="utf-8"
    )


class _StagingDirectory:
    def __init__(self, path: Path) -> None:
        self.path: Path | None = path

    def disarm(self) -> None:
        self.path = None

    def __enter__(self) -> _StagingDirectory:
        return self

    def __exit__(self, *args: object) -> None:
        if self.path is not None and self.path.exists():
            shutil.rmtree(self.path, ignore_errors=True)


def _publish_staged_directory(staging_dir: Path, target_dir: Path) -> None:
    if not target_dir.exists():
        staging_dir.rename(target_dir)
        return

    parent = target_dir.parent
    backup_dir = parent / f".{target_dir.name}.previous-{uuid4()}"
    target_dir.rename(backup_dir)
    try:
        staging_dir.rename(target_dir)
    except OSError as error:
        try:
            backup_dir.rename(target_dir)
        except OSError as rollback_error:
            raise ValueError(
                f"{error}; failed to restore previous crop output: {rollback_error}"
            ) from error
        raise
    shutil.rmtree(backup_dir, ignore_errors=True)


def _is_too_many_open_files(exc: BaseException) -> bool:
    return isinstance(exc, OSError) and exc.errno in {errno.EMFILE, 24}


def _close_tiff_writers(writers: list[tuple[RoiBbox, tifffile.TiffWriter]]) -> None:
    for _, writer in writers:
        try:
            writer.close()
        except OSError:
            pass


def _discard_open_roi_writers(
    writers: list[tuple[RoiBbox, tifffile.TiffWriter]],
    output_dir: Path,
) -> None:
    """Close writers and remove any files they created (EMFILE fallback)."""
    _close_tiff_writers(writers)
    for bbox, _writer in writers:
        (output_dir / f"Roi{bbox.roi}.tif").unlink(missing_ok=True)


def _open_roi_writer(output_dir: Path, bbox: RoiBbox) -> tifffile.TiffWriter:
    path = output_dir / f"Roi{bbox.roi}.tif"
    return tifffile.TiffWriter(path, append=path.is_file())


def _write_frame_crops_in_batches(
    *,
    bboxes: list[RoiBbox],
    crops: list[np.ndarray],
    output_dir: Path,
    max_open: int,
) -> int:
    """Write one frame's ROI pages with at most ``max_open`` TiffWriters.

    Creates each ``Roi{n}.tif`` on first visit; later frames reopen with
    append=True and close after the batch. Returns the (possibly reduced)
    open limit after EMFILE retries.
    """
    open_limit = max(1, max_open)
    index = 0
    n_roi = len(bboxes)
    while index < n_roi:
        batch_end = min(n_roi, index + open_limit)
        writers: list[tuple[RoiBbox, tifffile.TiffWriter]] = []
        try:
            for bbox in bboxes[index:batch_end]:
                writers.append((bbox, _open_roi_writer(output_dir, bbox)))
            for (_bbox, writer), page in zip(
                writers, crops[index:batch_end], strict=True
            ):
                writer.write(page, contiguous=True)
            index = batch_end
        except OSError as exc:
            if not _is_too_many_open_files(exc) or open_limit <= 1:
                raise
            opened = len(writers)
            reduced = opened if opened > 0 else open_limit // 2
            open_limit = max(1, min(open_limit - 1, reduced))
        finally:
            _close_tiff_writers(writers)
    return open_limit


def _iter_source_planes(
    *,
    pos: int,
    read_frame: Callable[[int, int, int, int], np.ndarray],
    time_indices: list[int],
    channel_indices: list[int],
    z_indices: list[int],
    frame_shape: tuple[int, int],
    dtype: np.dtype,
) -> Iterator[np.ndarray]:
    for time_index in time_indices:
        for channel_index in channel_indices:
            for z_index in z_indices:
                frame = np.asarray(read_frame(pos, time_index, channel_index, z_index))
                if frame.shape != frame_shape:
                    raise ValueError(
                        f"Inconsistent frame shape at Pos{pos} t={time_index} "
                        f"c={channel_index} z={z_index}: {frame.shape} vs {frame_shape}"
                    )
                if frame.dtype != dtype:
                    frame = frame.astype(dtype, copy=False)
                yield frame


def _write_roi_tiffs_frame_major(
    *,
    pos: int,
    bboxes: list[RoiBbox],
    output_dir: Path,
    read_frame: Callable[[int, int, int, int], np.ndarray],
    time_indices: list[int],
    channel_indices: list[int],
    z_indices: list[int],
    frame_shape: tuple[int, int],
    dtype: np.dtype,
    on_frame_done: Callable[[], None] | None,
    fd_budget: int | None = None,
) -> None:
    """Read each full frame once and append a TIFF page for every ROI.

    Prefer holding every ``Roi{n}.tif`` writer open for the position so the
    source is not re-read. If a single position has more ROIs than
    ``budget - 1`` (or open() raises EMFILE), crop every ROI of the current
    frame into memory and write with at most ``budget - 1`` TiffWriters,
    reopening files in append mode between batches. Never re-scan the source.
    """
    budget = crop_fd_budget() if fd_budget is None else fd_budget
    max_open = max(1, budget - 1)
    plane_kwargs = {
        "pos": pos,
        "read_frame": read_frame,
        "time_indices": time_indices,
        "channel_indices": channel_indices,
        "z_indices": z_indices,
        "frame_shape": frame_shape,
        "dtype": dtype,
    }

    writers: list[tuple[RoiBbox, tifffile.TiffWriter]] = []
    try:
        if len(bboxes) <= max_open:
            try:
                for bbox in bboxes:
                    writers.append(
                        (
                            bbox,
                            tifffile.TiffWriter(output_dir / f"Roi{bbox.roi}.tif"),
                        )
                    )
            except OSError as exc:
                opened = len(writers)
                _discard_open_roi_writers(writers, output_dir)
                writers = []
                if not _is_too_many_open_files(exc):
                    raise
                max_open = max(1, opened) if opened else max(1, max_open // 2)
            else:
                for frame in _iter_source_planes(**plane_kwargs):
                    for bbox, writer in writers:
                        writer.write(_crop_frame(frame, bbox), contiguous=True)
                    if on_frame_done is not None:
                        on_frame_done()
                return
    finally:
        _close_tiff_writers(writers)

    for frame in _iter_source_planes(**plane_kwargs):
        crops = [_crop_frame(frame, bbox) for bbox in bboxes]
        max_open = _write_frame_crops_in_batches(
            bboxes=bboxes,
            crops=crops,
            output_dir=output_dir,
            max_open=max_open,
        )
        if on_frame_done is not None:
            on_frame_done()


def _crop_position_with_reader(
    *,
    workspace: Path,
    source: Path,
    pos: int,
    bboxes: list[RoiBbox],
    info: ImageInfo,
    read_frame: Callable[[int, int, int, int], np.ndarray],
    times: list[int] | None,
    channels: list[int] | None,
    z_slices: list[int] | None,
    on_progress: ProgressCallback | None,
    fd_budget: int | None = None,
) -> CropPositionResult:
    output_dir = workspace_roi_pos_dir(workspace, pos)

    time_indices = times if times is not None else list(range(info.n_time))
    channel_indices = channels if channels is not None else list(range(info.n_chan))
    z_indices = z_slices if z_slices is not None else list(range(info.n_z))
    if not time_indices or not channel_indices or not z_indices:
        raise ValueError(f"No frames selected for crop at Pos{pos}")

    first = np.asarray(
        read_frame(pos, time_indices[0], channel_indices[0], z_indices[0])
    )
    if first.ndim != 2:
        raise ValueError(f"Expected 2D frame for Pos{pos}, got shape {first.shape}")
    height, width = int(first.shape[0]), int(first.shape[1])
    validate_bboxes(bboxes, width, height)
    frame_shape = (height, width)
    dtype = first.dtype

    def read_frame_or_first(p: int, t: int, c: int, z: int) -> np.ndarray:
        if (
            p == pos
            and t == time_indices[0]
            and c == channel_indices[0]
            and z == z_indices[0]
        ):
            return first
        return read_frame(p, t, c, z)

    roi_parent = output_dir.parent
    roi_parent.mkdir(parents=True, exist_ok=True)
    staging_dir = roi_parent / f".Pos{pos}.crop-{uuid4()}"
    staging_dir.mkdir(parents=True, exist_ok=False)

    total_frames = len(time_indices) * len(channel_indices) * len(z_indices)
    frames_done = 0
    progress_step = max(1, total_frames // 20)

    def on_frame_done() -> None:
        nonlocal frames_done
        frames_done += 1
        if on_progress is None:
            return
        if (
            frames_done == 1
            or frames_done == total_frames
            or frames_done % progress_step == 0
        ):
            on_progress(f"Pos{pos}: cropped frame {frames_done}/{total_frames}")

    with _StagingDirectory(staging_dir) as staging:
        # Frame-major streaming write (lisca): one source read per plane, page all ROIs.
        _write_roi_tiffs_frame_major(
            pos=pos,
            bboxes=bboxes,
            output_dir=staging_dir,
            read_frame=read_frame_or_first,
            time_indices=time_indices,
            channel_indices=channel_indices,
            z_indices=z_indices,
            frame_shape=frame_shape,
            dtype=dtype,
            on_frame_done=on_frame_done,
            fd_budget=fd_budget,
        )

        _write_index(
            output_dir=staging_dir,
            pos=pos,
            time_count=len(time_indices),
            channel_count=len(channel_indices),
            z_count=len(z_indices),
            bboxes=bboxes,
            time_indices=time_indices,
        )
        _publish_staged_directory(staging_dir, output_dir)
        staging.disarm()

    return CropPositionResult(pos=pos, output_dir=output_dir, roi_count=len(bboxes))


def crop_position(
    workspace: Path,
    source: Path,
    pos: int,
    *,
    times: list[int] | None = None,
    channels: list[int] | None = None,
    z_slices: list[int] | None = None,
    on_progress: ProgressCallback | None = None,
) -> CropPositionResult | None:
    workspace = workspace.resolve()
    source = source.expanduser().resolve()
    migrate_workspace(workspace)
    bbox_path = workspace_bbox_csv_path(workspace, pos)
    if not bbox_path.is_file():
        return None

    bboxes = parse_bbox_csv(bbox_path)
    info, read_frame, close = open_reader(source)
    try:
        return _crop_position_with_reader(
            workspace=workspace,
            source=source,
            pos=pos,
            bboxes=bboxes,
            info=info,
            read_frame=read_frame,
            times=times,
            channels=channels,
            z_slices=z_slices,
            on_progress=on_progress,
            fd_budget=crop_fd_budget(),
        )
    finally:
        close()


def _position_worker(
    *,
    workspace: Path,
    source: Path,
    queue: deque[tuple[int, list[RoiBbox]]],
    queue_lock: threading.Lock,
    results: list[CropPositionResult],
    results_lock: threading.Lock,
    errors: list[BaseException],
    errors_lock: threading.Lock,
    on_progress: ProgressCallback | None,
    progress_lock: threading.Lock,
    fd_budget: int,
) -> None:
    info, read_frame, close = open_reader(source)
    try:
        while True:
            with errors_lock:
                if errors:
                    return
            with queue_lock:
                if not queue:
                    return
                pos, bboxes = queue.popleft()

            def progress(message: str) -> None:
                if on_progress is None:
                    return
                with progress_lock:
                    on_progress(message)

            try:
                progress(f"Cropping Pos{pos}")
                result = _crop_position_with_reader(
                    workspace=workspace,
                    source=source,
                    pos=pos,
                    bboxes=bboxes,
                    info=info,
                    read_frame=read_frame,
                    times=None,
                    channels=None,
                    z_slices=None,
                    on_progress=progress,
                    fd_budget=fd_budget,
                )
                with results_lock:
                    results.append(result)
                progress(f"Finished Pos{pos}")
            except BaseException as exc:  # noqa: BLE001 - surface worker failures to caller
                with errors_lock:
                    errors.append(exc)
                return
    finally:
        close()


def run_crop(
    *,
    workspace: Path,
    source: Path,
    positions: list[int] | None = None,
    on_progress: ProgressCallback | None = None,
) -> CropRunResult:
    workspace = workspace.resolve()
    source = source.expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Source not found: {source}")

    migrate_workspace(workspace)
    requested = (
        positions if positions is not None else discover_bbox_positions(workspace)
    )
    if not requested:
        raise ValueError(f"No bbox positions found under {workspace / 'bbox'}")

    jobs: list[tuple[int, list[RoiBbox]]] = []
    skipped_missing_bbox: list[int] = []

    for pos in requested:
        bbox_path = workspace_bbox_csv_path(workspace, pos)
        if not bbox_path.is_file():
            skipped_missing_bbox.append(pos)
            continue
        jobs.append((pos, parse_bbox_csv(bbox_path)))

    if not jobs:
        if skipped_missing_bbox:
            raise ValueError(
                "No bbox CSVs found for requested positions under "
                f"{workspace / 'bbox'}: {skipped_missing_bbox}"
            )
        raise ValueError("No ROI positions were cropped")

    queue: deque[tuple[int, list[RoiBbox]]] = deque(jobs)
    queue_lock = threading.Lock()
    results: list[CropPositionResult] = []
    results_lock = threading.Lock()
    errors: list[BaseException] = []
    errors_lock = threading.Lock()
    progress_lock = threading.Lock()
    fd_budget = crop_fd_budget()
    max_roi_count = max(len(bboxes) for _, bboxes in jobs)
    worker_count = crop_position_worker_count(
        len(jobs),
        max_roi_count=max_roi_count,
        fd_budget=fd_budget,
    )

    if on_progress is not None:
        on_progress(
            f"Starting crop with {worker_count} worker(s) for {len(jobs)} position(s)"
        )

    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = [
            executor.submit(
                _position_worker,
                workspace=workspace,
                source=source,
                queue=queue,
                queue_lock=queue_lock,
                results=results,
                results_lock=results_lock,
                errors=errors,
                errors_lock=errors_lock,
                on_progress=on_progress,
                progress_lock=progress_lock,
                fd_budget=fd_budget,
            )
            for _ in range(worker_count)
        ]
        for future in futures:
            future.result()

    if errors:
        raise errors[0]

    written = sorted(results, key=lambda item: item.pos)
    if not written:
        raise ValueError("No ROI positions were cropped")

    return CropRunResult(
        written=written,
        skipped_missing_bbox=skipped_missing_bbox,
    )


def format_written_crop_message(result: CropPositionResult) -> str:
    noun = "ROI" if result.roi_count == 1 else "ROIs"
    return (
        f"Cropped {result.roi_count} {noun} for Pos{result.pos} "
        f"under: {result.output_dir}"
    )
