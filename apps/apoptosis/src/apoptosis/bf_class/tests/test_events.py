from __future__ import annotations

import csv
import json
from pathlib import Path

from apoptosis.bf_class.config import TimelapsePredictionRow
from apoptosis.bf_class.events import (
    detect_event,
    discover_roi_timelapses,
    first_sustained_crossing,
)


def test_discover_roi_timelapses_prefers_index_order(tmp_path: Path) -> None:
    roi_root = tmp_path / "Pos0"
    roi_root.mkdir()
    (roi_root / "Roi10.tif").write_bytes(b"")
    (roi_root / "Roi2.tif").write_bytes(b"")
    (roi_root / "index.json").write_text(
        json.dumps(
            {
                "rois": [
                    {"roi": 10, "fileName": "Roi10.tif"},
                    {"roi": 2, "fileName": "Roi2.tif"},
                    {"roi": 99, "fileName": "missing.tif"},
                ]
            }
        ),
        encoding="utf-8",
    )

    discovered = discover_roi_timelapses(roi_root)

    assert [item.roi for item in discovered] == [2, 10]
    assert [item.tif_path.name for item in discovered] == ["Roi2.tif", "Roi10.tif"]


def test_first_sustained_crossing_uses_hold_frames() -> None:
    rows = [
        TimelapsePredictionRow(time_index=0, dead_probability=0.1, hard_label="live"),
        TimelapsePredictionRow(time_index=1, dead_probability=0.7, hard_label="dead"),
        TimelapsePredictionRow(time_index=2, dead_probability=0.4, hard_label="live"),
        TimelapsePredictionRow(time_index=3, dead_probability=0.8, hard_label="dead"),
        TimelapsePredictionRow(time_index=4, dead_probability=0.9, hard_label="dead"),
    ]

    assert first_sustained_crossing(rows, threshold=0.5, hold_frames=1) == 1
    assert first_sustained_crossing(rows, threshold=0.5, hold_frames=2) == 3


def test_detect_event_writes_frame_timing(tmp_path: Path) -> None:
    rows = [
        TimelapsePredictionRow(time_index=0, dead_probability=0.1, hard_label="live"),
        TimelapsePredictionRow(time_index=1, dead_probability=0.6, hard_label="dead"),
        TimelapsePredictionRow(time_index=2, dead_probability=0.7, hard_label="dead"),
    ]

    event = detect_event(
        7,
        tmp_path / "Roi7.tif",
        rows,
        threshold=0.5,
        hold_frames=2,
    )

    assert event.detected is True
    assert event.event_t == 1
    assert event.event_probability == 0.6
    assert event.last_t == 2


def test_events_main_dispatches_batch_runner(tmp_path: Path, monkeypatch) -> None:
    from apoptosis.bf_class import cli

    captured: dict[str, object] = {}

    def fake_run_batch_events(**kwargs):
        captured.update(kwargs)
        events_csv = kwargs["output_csv_path"].resolve()
        with events_csv.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["roi", "detected"])
            writer.writeheader()
        return type(
            "Result",
            (),
            {
                "events_csv_path": events_csv,
                "scores_csv_path": None,
                "events": [type("Event", (), {"detected": True})()],
            },
        )()

    monkeypatch.setattr(cli, "run_batch_events", fake_run_batch_events)

    cli.events_main(
        [
            str(tmp_path / "best.pt"),
            str(tmp_path / "roi" / "Pos0"),
            "--output-csv",
            str(tmp_path / "events.csv"),
            "--hold-frames",
            "2",
        ]
    )

    assert captured["checkpoint_path"] == tmp_path / "best.pt"
    assert captured["roi_root"] == tmp_path / "roi" / "Pos0"
    assert captured["hold_frames"] == 2
