from __future__ import annotations

import json
from pathlib import Path

from click.exceptions import Exit
import pytest

from delivery import analyze


def test_run_analysis_orchestrates_expected_outputs(monkeypatch, tmp_path: Path) -> None:
    dataset_root = tmp_path / "dataset"
    slide_path = tmp_path / "slide.json"
    output_dir = tmp_path / "out"
    timeseries_csv_a = output_dir / "slide_sc0_ch001_timeseries.csv"
    timeseries_csv_b = output_dir / "slide_sc2_ch001_timeseries.csv"
    auc_csv = output_dir / "slide_ch001_timeseries_auc.csv"
    timeseries_plot = output_dir / "slide_ch001_timeseries_combined.png"
    auc_plot = output_dir / "slide_ch001_timeseries_auc.png"

    calls: list[tuple[str, object]] = []

    monkeypatch.setattr(
        analyze.timeseries,
        "run_slide_timeseries",
        lambda dataset_root_arg, *, slide, channel, output_csv, correction_quartile: (
            calls.append(("timeseries", (dataset_root_arg, slide, channel, output_csv, correction_quartile))),
            analyze.timeseries.SlideTimeseriesRunResult(
                written_outputs=[(0, timeseries_csv_a, 2), (2, timeseries_csv_b, 3)],
                skipped_positions={2: [26]},
            ),
        )[1],
    )
    monkeypatch.setattr(
        analyze.auc,
        "run_auc",
        lambda csvs, *, interval, output_csv: (
            calls.append(("auc", (csvs, interval, output_csv))),
            auc_csv,
        )[1],
    )
    monkeypatch.setattr(
        analyze.plot_timeseries,
        "run_plot_timeseries",
        lambda csvs, *, output_plot, columns, alpha, linewidth, color, title: (
            calls.append(("plot_timeseries", (csvs, output_plot, columns, alpha, linewidth, color, title))),
            timeseries_plot,
        )[1],
    )
    monkeypatch.setattr(
        analyze.plot_auc,
        "run_plot_auc",
        lambda auc_csv_arg, *, output_plot, color, title: (
            calls.append(("plot_auc", (auc_csv_arg, output_plot, color, title))),
            auc_plot,
        )[1],
    )

    result = analyze.run_analysis(
        dataset_root,
        slide=slide_path,
        channel=1,
        interval=10.0,
        output_dir=output_dir,
        correction_quartile=analyze.timeseries.DELIVERY_CORRECTION_QUARTILE,
    )

    assert result.timeseries_csvs == [timeseries_csv_a, timeseries_csv_b]
    assert result.auc_csv == auc_csv
    assert result.timeseries_plot == timeseries_plot
    assert result.auc_plot == auc_plot
    assert result.skipped_positions == {2: [26]}
    assert calls == [
        ("timeseries", (dataset_root, slide_path, 1, output_dir, analyze.timeseries.DELIVERY_CORRECTION_QUARTILE)),
        ("auc", ([timeseries_csv_a, timeseries_csv_b], 10.0, None)),
        ("plot_timeseries", ([timeseries_csv_a, timeseries_csv_b], None, 3, 0.12, 1.0, "#c03a2b", None)),
        ("plot_auc", (auc_csv, None, "#c03a2b", "AUC by slide channel")),
    ]


def test_run_analysis_emits_stage_updates(monkeypatch, tmp_path: Path) -> None:
    dataset_root = tmp_path / "dataset"
    slide_path = tmp_path / "slide.json"
    result = analyze.timeseries.SlideTimeseriesRunResult(
        written_outputs=[(0, tmp_path / "slide_sc0_ch001_timeseries.csv", 2)],
        skipped_positions={},
    )
    stage_updates: list[tuple[int, int, str]] = []

    monkeypatch.setattr(analyze.timeseries, "run_slide_timeseries", lambda *args, **kwargs: result)
    monkeypatch.setattr(analyze.auc, "run_auc", lambda *args, **kwargs: tmp_path / "auc.csv")
    monkeypatch.setattr(
        analyze.plot_timeseries,
        "run_plot_timeseries",
        lambda *args, **kwargs: tmp_path / "timeseries.png",
    )
    monkeypatch.setattr(analyze.plot_auc, "run_plot_auc", lambda *args, **kwargs: tmp_path / "auc.png")

    analyze.run_analysis(
        dataset_root,
        slide=slide_path,
        channel=1,
        interval=10.0,
        output_dir=None,
        correction_quartile=analyze.timeseries.DELIVERY_CORRECTION_QUARTILE,
        on_stage=lambda completed, total, description: stage_updates.append((completed, total, description)),
    )

    assert stage_updates == [
        (0, 4, "Computing timeseries CSVs"),
        (1, 4, "Computing AUC summary"),
        (2, 4, "Rendering timeseries plot"),
        (3, 4, "Rendering AUC plot"),
        (4, 4, "Analysis complete"),
    ]


def test_to_result_payload_serializes_paths(tmp_path: Path) -> None:
    result = analyze.AnalyzeRunResult(
        dataset_root=tmp_path / "dataset",
        slide=tmp_path / "slide.json",
        channel=2,
        interval=5.0,
        timeseries_csvs=[tmp_path / "a.csv", tmp_path / "b.csv"],
        auc_csv=tmp_path / "auc.csv",
        timeseries_plot=tmp_path / "timeseries.png",
        auc_plot=tmp_path / "auc.png",
        skipped_positions={1: [3, 5]},
    )

    payload = analyze.to_result_payload(result)

    assert payload == {
        "status": "success",
        "dataset_root": str(result.dataset_root),
        "slide": str(result.slide),
        "channel": 2,
        "interval": 5.0,
        "timeseries_csvs": [str(tmp_path / "a.csv"), str(tmp_path / "b.csv")],
        "auc_csv": str(tmp_path / "auc.csv"),
        "timeseries_plot": str(tmp_path / "timeseries.png"),
        "auc_plot": str(tmp_path / "auc.png"),
        "skipped_positions": {1: [3, 5]},
    }


def test_cli_with_json_emits_error_payload(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    dataset_root = tmp_path / "dataset"
    slide_path = tmp_path / "slide.json"
    dataset_root.mkdir()
    slide_path.write_text("{}", encoding="utf-8")

    with pytest.raises(Exit) as exc_info:
        analyze.cli(
            dataset_root=dataset_root,
            slide=slide_path,
            channel=1,
            interval=10.0,
            output_dir=None,
            correction_quartile=analyze.timeseries.DELIVERY_CORRECTION_QUARTILE,
            json_output=True,
        )

    assert exc_info.value.exit_code == 1
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert payload["status"] == "error"
    assert payload["channel"] == 1
    assert payload["interval"] == 10.0
    assert "defines no slide channels" in payload["error"]
