from __future__ import annotations

import errno
import json
from pathlib import Path

import numpy as np
import pytest
import tifffile

from lisca.core.align_drift import AlignDrift, DriftKeyframe
from lisca.core.bbox import RoiBbox
from lisca.core.paths import align_json_path
from lisca.readers.base import ImageInfo
from lisca.services import crop


def _read_roi_stack(path: Path, expected_shape: tuple[int, ...]) -> np.ndarray:
    stack = np.asarray(tifffile.imread(path, key=slice(None)))
    if stack.shape != expected_shape:
        expected_size = int(np.prod(expected_shape, dtype=np.int64))
        if stack.size != expected_size:
            raise ValueError(
                f"{path} shape mismatch: expected {expected_shape}, got {stack.shape}"
            )
        stack = stack.reshape(expected_shape)
    return stack


def test_crop_fd_budget_leaves_headroom() -> None:
    assert crop.crop_fd_budget(soft_limit=1024) == 768
    assert crop.crop_fd_budget(soft_limit=200) == 64
    assert crop.crop_fd_budget(soft_limit=400) == 144


def test_crop_fd_budget_reads_rlimit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(crop.resource, "getrlimit", lambda _code: (1024, 4096))
    assert crop.crop_fd_budget() == 768


def test_crop_position_worker_count_defaults_to_one(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("LISCA_CROP_WORKERS", raising=False)
    monkeypatch.setattr(crop.os, "cpu_count", lambda: 8)
    assert crop.crop_position_worker_count(3, fd_budget=10_000) == 1
    assert crop.crop_position_worker_count(20, fd_budget=10_000) == 1

    monkeypatch.setenv("LISCA_CROP_WORKERS", "6")
    monkeypatch.setattr(crop.os, "cpu_count", lambda: 32)
    assert crop.crop_position_worker_count(20, fd_budget=10_000) == 6
    assert crop.crop_position_worker_count(3, fd_budget=10_000) == 3

    monkeypatch.setenv("LISCA_CROP_WORKERS", "nope")
    assert crop.crop_position_worker_count(20, fd_budget=10_000) == 1


def test_crop_position_worker_count_shrinks_when_roi_grid_exceeds_fd_budget(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LISCA_CROP_WORKERS", "8")
    assert crop.crop_position_worker_count(20, max_roi_count=80, fd_budget=300) == 3
    assert crop.crop_position_worker_count(20, max_roi_count=80, fd_budget=100) == 1
    assert crop.crop_position_worker_count(5, max_roi_count=10_000, fd_budget=64) == 1


def test_frame_major_crop_reads_each_plane_once(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    source = tmp_path / "source.nd2"
    source.write_bytes(b"placeholder")
    (workspace / "bbox").mkdir(parents=True)
    (workspace / "bbox" / "Pos0.csv").write_text(
        "roi,x,y,w,h\n0,0,0,2,2\n1,2,0,2,2\n",
        encoding="utf-8",
    )

    reads: list[tuple[int, int, int, int]] = []

    def read_frame(p: int, t: int, c: int, z: int) -> np.ndarray:
        reads.append((p, t, c, z))
        _yy, xx = np.mgrid[0:4, 0:4]
        return (1000 * t + 100 * c + 10 * z + xx).astype(np.uint16)

    info = ImageInfo(n_pos=1, n_time=2, n_chan=2, n_z=1)
    result = crop._crop_position_with_reader(
        workspace=workspace,
        source=source,
        pos=0,
        bboxes=[
            RoiBbox(roi=0, x=0, y=0, w=2, h=2),
            RoiBbox(roi=1, x=2, y=0, w=2, h=2),
        ],
        info=info,
        read_frame=read_frame,
        times=None,
        channels=None,
        z_slices=None,
        on_progress=None,
    )

    assert result.roi_count == 2
    assert reads[0] == (0, 0, 0, 0)
    assert set(reads[1:]) == {(0, 0, 1, 0), (0, 1, 0, 0), (0, 1, 1, 0)}
    assert len(reads) == 4

    index = json.loads((result.output_dir / "index.json").read_text(encoding="utf-8"))
    assert index["timeCount"] == 2
    assert index["channelCount"] == 2
    assert index["zCount"] == 1

    stack0 = _read_roi_stack(result.output_dir / "Roi0.tif", (2, 2, 1, 2, 2))
    stack1 = _read_roi_stack(result.output_dir / "Roi1.tif", (2, 2, 1, 2, 2))
    assert stack0[1, 0, 0, 0, 0] == 1000
    assert stack1[1, 0, 0, 0, 0] == 1002


def _write_and_check_roi_tiffs(
    tmp_path: Path,
    *,
    n_roi: int,
    fd_budget: int,
) -> list[tuple[int, int, int, int]]:
    bboxes = [RoiBbox(roi=i, x=i, y=0, w=1, h=1) for i in range(n_roi)]
    reads: list[tuple[int, int, int, int]] = []

    def read_frame(p: int, t: int, c: int, z: int) -> np.ndarray:
        reads.append((p, t, c, z))
        return np.arange(n_roi, dtype=np.uint16).reshape(1, n_roi) + np.uint16(100 * t)

    crop._write_roi_tiffs_frame_major(
        pos=0,
        bboxes=bboxes,
        output_dir=tmp_path,
        read_frame=read_frame,
        time_indices=[0, 1],
        channel_indices=[0],
        z_indices=[0],
        frame_shape=(1, n_roi),
        dtype=np.dtype(np.uint16),
        on_frame_done=None,
        fd_budget=fd_budget,
    )
    for i in range(n_roi):
        stack = _read_roi_stack(tmp_path / f"Roi{i}.tif", (2, 1, 1, 1, 1))
        assert stack[0, 0, 0, 0, 0] == i
        assert stack[1, 0, 0, 0, 0] == i + 100
    return reads


def test_frame_major_write_reads_each_plane_once_for_all_rois(tmp_path: Path) -> None:
    reads = _write_and_check_roi_tiffs(tmp_path, n_roi=40, fd_budget=10_000)
    assert reads == [(0, 0, 0, 0), (0, 1, 0, 0)]


def test_frame_major_append_path_reads_each_plane_once(tmp_path: Path) -> None:
    reads = _write_and_check_roi_tiffs(tmp_path, n_roi=5, fd_budget=3)
    assert reads == [(0, 0, 0, 0), (0, 1, 0, 0)]
    assert len(reads) == 2 * 1 * 1


def test_emfile_during_open_falls_back_without_rereading(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    n_roi = 5
    real_writer = crop.tifffile.TiffWriter
    state = {"opens": 0, "injected": False}

    def wrapping(*args: object, **kwargs: object) -> tifffile.TiffWriter:
        state["opens"] += 1
        if not state["injected"] and state["opens"] == 3:
            state["injected"] = True
            raise OSError(errno.EMFILE, "Too many open files")
        return real_writer(*args, **kwargs)

    monkeypatch.setattr(crop.tifffile, "TiffWriter", wrapping)
    reads = _write_and_check_roi_tiffs(tmp_path, n_roi=n_roi, fd_budget=100)
    assert state["injected"] is True
    assert reads == [(0, 0, 0, 0), (0, 1, 0, 0)]


def _source_frame(time: int, *, height: int, width: int) -> np.ndarray:
    y_index, x_index = np.indices((height, width))
    return (1 + time + y_index * width + x_index).astype(np.uint16)


def _write_align(workspace: Path, pos: int, drift: dict[str, object] | None) -> None:
    payload: dict[str, object] = {
        "excludedPatterns": [],
        "grid": {
            "enabled": True,
            "shape": "rect",
            "tx": 3.0,
            "ty": -4.0,
            "rotation": 0.0,
            "spacingA": 20.0,
            "spacingB": 20.0,
            "patternWidth": 8.0,
            "patternHeight": 8.0,
            "opacity": 0.35,
        },
    }
    if drift is not None:
        payload["drift"] = drift
    path = align_json_path(workspace, pos)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_crop_shift_rounds_half_toward_positive_infinity() -> None:
    assert crop._js_round(0.5) == 1
    assert crop._js_round(-0.5) == 0
    assert crop._js_round(1.5) == 2
    assert crop._js_round(-1.5) == -1
    halfway = AlignDrift(
        reference_time=0,
        interpolation="linear",
        keyframes=(DriftKeyframe(time=10, dx=1.0, dy=-1.0),),
    )
    assert crop._crop_shift(None, 5) == (0, 0)
    assert crop._crop_shift(halfway, 0) == (0, 0)
    assert crop._crop_shift(halfway, 5) == (1, 0)
    assert crop._crop_shift(halfway, 10) == (1, -1)
    explicit = AlignDrift(
        reference_time=0,
        interpolation="linear",
        keyframes=(DriftKeyframe(time=5, dx=-0.5, dy=0.5),),
    )
    assert crop._crop_shift(explicit, 5) == (0, 1)


def test_padded_window_keeps_stored_page_shape() -> None:
    frame = np.arange(1, 33, dtype=np.uint16).reshape(4, 8)
    left = crop._crop_frame_padded(frame, -1, 0, 1, 1)
    assert left.shape == (1, 1)
    assert int(left[0, 0]) == 0
    far = crop._crop_frame_padded(frame, 8, 0, 1, 1)
    assert far.shape == (1, 1)
    assert int(far[0, 0]) == 0
    partial = crop._crop_frame_padded(frame, -1, 0, 2, 1)
    assert partial.shape == (1, 2)
    assert int(partial[0, 0]) == 0
    assert int(partial[0, 1]) == int(frame[0, 0])


def test_crop_without_drift_matches_unshifted_pixels(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    source = tmp_path / "source.nd2"
    source.write_bytes(b"placeholder")
    height, width = 4, 6
    frames = {
        time: _source_frame(time, height=height, width=width) for time in range(3)
    }
    bbox = RoiBbox(roi=0, x=1, y=1, w=2, h=2)

    def read_frame(p: int, t: int, c: int, z: int) -> np.ndarray:
        del p, c, z
        return frames[t]

    def crop_once(messages: list[str]) -> np.ndarray:
        return _read_roi_stack(
            crop._crop_position_with_reader(
                workspace=workspace,
                source=source,
                pos=0,
                bboxes=[bbox],
                info=ImageInfo(n_pos=1, n_time=3, n_chan=1, n_z=1),
                read_frame=read_frame,
                times=None,
                channels=None,
                z_slices=None,
                on_progress=messages.append,
            ).output_dir
            / "Roi0.tif",
            (3, 1, 1, 2, 2),
        )

    missing_messages: list[str] = []
    missing = crop_once(missing_messages)
    _write_align(workspace, 0, None)
    bare_messages: list[str] = []
    bare = crop_once(bare_messages)
    np.testing.assert_array_equal(bare, missing)
    for time, frame in frames.items():
        np.testing.assert_array_equal(bare[time, 0, 0], frame[1:3, 1:3])
    assert bare.shape == (3, 1, 1, 2, 2)
    assert not any("drift" in message for message in missing_messages + bare_messages)
    index = json.loads(
        (workspace / "roi" / "Pos0" / "index.json").read_text(encoding="utf-8")
    )
    assert index["timeIndices"] == [0, 1, 2]
    assert index["rois"][0]["bbox"] == {"roi": 0, "x": 1, "y": 1, "w": 2, "h": 2}


def test_crop_pads_shifted_windows_and_keeps_reference_bbox(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    source = tmp_path / "source.nd2"
    source.write_bytes(b"placeholder")
    height, width = 2, 8
    times = [0, 5, 10, 15]
    frames = {time: _source_frame(time, height=height, width=width) for time in times}
    bboxes = [
        RoiBbox(roi=0, x=0, y=0, w=1, h=1),
        RoiBbox(roi=1, x=7, y=0, w=1, h=1),
    ]
    _write_align(
        workspace,
        0,
        {
            "referenceTime": 0,
            "interpolation": "linear",
            "keyframes": [
                {"time": 5, "dx": -1.0, "dy": 0.0},
                {"time": 10, "dx": 1.0, "dy": 0.0},
                {"time": 15, "dx": -0.5, "dy": 0.5},
            ],
        },
    )
    messages: list[str] = []

    def read_frame(p: int, t: int, c: int, z: int) -> np.ndarray:
        del p, c, z
        return frames[t]

    result = crop._crop_position_with_reader(
        workspace=workspace,
        source=source,
        pos=0,
        bboxes=bboxes,
        info=ImageInfo(n_pos=1, n_time=4, n_chan=1, n_z=1),
        read_frame=read_frame,
        times=times,
        channels=[0],
        z_slices=[0],
        on_progress=messages.append,
    )
    assert "Pos0: drift 3 keyframes, max shift 1 px" in messages
    left = _read_roi_stack(result.output_dir / "Roi0.tif", (4, 1, 1, 1, 1))
    right = _read_roi_stack(result.output_dir / "Roi1.tif", (4, 1, 1, 1, 1))
    assert left.shape == (4, 1, 1, 1, 1)
    assert right.shape == (4, 1, 1, 1, 1)
    assert int(left[0, 0, 0, 0, 0]) == int(frames[0][0, 0])
    assert int(right[0, 0, 0, 0, 0]) == int(frames[0][0, 7])
    assert int(left[1, 0, 0, 0, 0]) == 0
    assert int(right[1, 0, 0, 0, 0]) == int(frames[5][0, 6])
    assert int(left[2, 0, 0, 0, 0]) == int(frames[10][0, 1])
    assert int(right[2, 0, 0, 0, 0]) == 0
    assert int(left[3, 0, 0, 0, 0]) == int(frames[15][1, 0])
    assert int(right[3, 0, 0, 0, 0]) == int(frames[15][1, 7])
    index = json.loads((result.output_dir / "index.json").read_text(encoding="utf-8"))
    assert index["timeIndices"] == times
    assert index["rois"][0]["bbox"] == {"roi": 0, "x": 0, "y": 0, "w": 1, "h": 1}
    assert index["rois"][1]["bbox"] == {"roi": 1, "x": 7, "y": 0, "w": 1, "h": 1}


def test_crop_warns_when_keyframe_time_is_not_cropped(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    source = tmp_path / "source.nd2"
    source.write_bytes(b"placeholder")
    frame = _source_frame(0, height=4, width=4)
    _write_align(
        workspace,
        3,
        {
            "referenceTime": 0,
            "interpolation": "linear",
            "keyframes": [{"time": 4, "dx": 2.0, "dy": -2.0}],
        },
    )
    messages: list[str] = []

    def read_frame(p: int, t: int, c: int, z: int) -> np.ndarray:
        del p, t, c, z
        return frame

    result = crop._crop_position_with_reader(
        workspace=workspace,
        source=source,
        pos=3,
        bboxes=[RoiBbox(roi=0, x=1, y=1, w=2, h=2)],
        info=ImageInfo(n_pos=1, n_time=2, n_chan=1, n_z=1),
        read_frame=read_frame,
        times=[0, 2],
        channels=[0],
        z_slices=[0],
        on_progress=messages.append,
    )
    assert messages.count("Pos3: drift keyframe time is not in the cropped times") == 1
    assert "Pos3: drift 1 keyframes, max shift 1 px" in messages
    stack = _read_roi_stack(result.output_dir / "Roi0.tif", (2, 1, 1, 2, 2))
    np.testing.assert_array_equal(stack[0, 0, 0], frame[1:3, 1:3])
    np.testing.assert_array_equal(stack[1, 0, 0], frame[0:2, 2:4])
