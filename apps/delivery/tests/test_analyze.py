from __future__ import annotations

from pathlib import Path

from delivery import analyze


def test_run_analysis_orchestrates_expected_outputs(monkeypatch, tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    slide_path = tmp_path / "slide.json"
    timeseries_csv_a = tmp_path / "slide_sc0_ch001_timeseries.csv"
    timeseries_csv_b = tmp_path / "slide_sc2_ch002_timeseries.csv"
    auc_csv = tmp_path / "slide_timeseries_auc.csv"
    fit_csv = tmp_path / "slide_timeseries_fit.csv"
    timeseries_plot = tmp_path / "slide_timeseries_combined.png"
    auc_plot = tmp_path / "slide_timeseries_auc.png"
    fit_plots = [
        tmp_path / "slide_timeseries_intensity_offset.png",
        tmp_path / "slide_timeseries_protein_lifetime.png",
        tmp_path / "slide_timeseries_mrna_lifetime.png",
        tmp_path / "slide_timeseries_expression_onset.png",
        tmp_path / "slide_timeseries_expression_slope.png",
        tmp_path / "slide_timeseries_fit_traces.png",
    ]

    calls: list[tuple[str, object]] = []
    output_messages: list[str] = []

    monkeypatch.setattr(
        analyze.timeseries,
        "run_slide_timeseries",
        lambda workspace_arg, *, slide, output_csv, correction_quartile=analyze.timeseries.DELIVERY_CORRECTION_QUARTILE, on_csv_written=None: (
            calls.append(("timeseries", (workspace_arg, slide, output_csv, correction_quartile))),
            on_csv_written(0, timeseries_csv_a, 2) if on_csv_written is not None else None,
            on_csv_written(2, timeseries_csv_b, 3) if on_csv_written is not None else None,
            analyze.timeseries.SlideTimeseriesRunResult(
                written_outputs=[(0, timeseries_csv_a, 2), (2, timeseries_csv_b, 3)],
                skipped_positions={2: [26]},
            ),
        )[-1],
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
        analyze.fit,
        "run_fit",
        lambda csvs, *, interval, output_csv: (
            calls.append(("fit", (csvs, interval, output_csv))),
            fit_csv,
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
    monkeypatch.setattr(
        analyze.plot_fit,
        "run_plot_fit",
        lambda fit_csv_arg, *, output_dir, color, interval, columns, alpha, linewidth: (
            calls.append(
                ("plot_fit", (fit_csv_arg, output_dir, color, interval, columns, alpha, linewidth))
            ),
            fit_plots,
        )[1],
    )

    result = analyze.run_analysis(
        workspace,
        slide=slide_path,
        interval=10.0,
        on_output=output_messages.append,
    )

    assert result.timeseries_csvs == [timeseries_csv_a, timeseries_csv_b]
    assert result.auc_csv == auc_csv
    assert result.fit_csv == fit_csv
    assert result.timeseries_plot == timeseries_plot
    assert result.auc_plot == auc_plot
    assert result.fit_plots == fit_plots
    assert result.skipped_positions == {2: [26]}
    assert calls == [
        ("timeseries", (workspace, slide_path, None, analyze.timeseries.DELIVERY_CORRECTION_QUARTILE)),
        ("auc", ([timeseries_csv_a, timeseries_csv_b], 10.0, None)),
        ("fit", ([timeseries_csv_a, timeseries_csv_b], 10.0, None)),
        ("plot_timeseries", ([timeseries_csv_a, timeseries_csv_b], None, 3, 0.12, 1.0, "#c03a2b", None)),
        ("plot_auc", (auc_csv, None, "#c03a2b", "AUC by slide channel")),
        ("plot_fit", (fit_csv, None, "#c03a2b", 10.0, 3, 0.12, 1.0)),
    ]
    assert output_messages == [
        analyze.timeseries.format_written_timeseries_csv_message(0, timeseries_csv_a, 2),
        analyze.timeseries.format_written_timeseries_csv_message(2, timeseries_csv_b, 3),
        analyze.timeseries.format_skipped_positions_message({2: [26]}),
        analyze.auc.format_written_auc_csv_message(auc_csv),
        analyze.fit.format_written_fit_csv_message(fit_csv),
        analyze.plot_timeseries.format_written_timeseries_plot_message(timeseries_plot),
        analyze.plot_auc.format_written_auc_plot_message(auc_plot),
        *analyze.plot_fit.format_written_fit_plot_messages(fit_plots),
    ]


def test_run_analysis_emits_stage_updates(monkeypatch, tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    slide_path = tmp_path / "slide.json"
    result = analyze.timeseries.SlideTimeseriesRunResult(
        written_outputs=[(0, tmp_path / "slide_sc0_ch001_timeseries.csv", 2)],
        skipped_positions={},
    )
    stage_updates: list[tuple[int, int, str]] = []

    monkeypatch.setattr(analyze.timeseries, "run_slide_timeseries", lambda *args, **kwargs: result)
    monkeypatch.setattr(analyze.auc, "run_auc", lambda *args, **kwargs: tmp_path / "auc.csv")
    monkeypatch.setattr(analyze.fit, "run_fit", lambda *args, **kwargs: tmp_path / "fit.csv")
    monkeypatch.setattr(
        analyze.plot_timeseries,
        "run_plot_timeseries",
        lambda *args, **kwargs: tmp_path / "timeseries.png",
    )
    monkeypatch.setattr(analyze.plot_auc, "run_plot_auc", lambda *args, **kwargs: tmp_path / "auc.png")
    monkeypatch.setattr(analyze.plot_fit, "run_plot_fit", lambda *args, **kwargs: [tmp_path / "fit-traces.png"])

    analyze.run_analysis(
        workspace,
        slide=slide_path,
        interval=10.0,
        on_stage=lambda completed, total, description: stage_updates.append((completed, total, description)),
    )

    assert stage_updates == [
        (0, 6, "Computing timeseries CSVs"),
        (1, 6, "Computing AUC summary"),
        (2, 6, "Computing exponential fit summary"),
        (3, 6, "Rendering timeseries plot"),
        (4, 6, "Rendering AUC plot"),
        (5, 6, "Rendering fit plots"),
        (6, 6, "Analysis complete"),
    ]


def test_completed_analysis_message_no_longer_mentions_one_channel(monkeypatch, tmp_path: Path, capsys) -> None:
    monkeypatch.setattr(
        analyze,
        "run_analysis",
        lambda workspace, *, slide, interval, on_stage=None, on_output=None: analyze.AnalyzeRunResult(
            workspace=workspace.resolve(),
            slide=slide.resolve(),
            interval=interval,
            timeseries_csvs=[
                tmp_path / "slide_sc0_ch001_timeseries.csv",
                tmp_path / "slide_sc2_ch002_timeseries.csv",
            ],
            auc_csv=tmp_path / "slide_timeseries_auc.csv",
            fit_csv=tmp_path / "slide_timeseries_fit.csv",
            timeseries_plot=tmp_path / "slide_timeseries_combined.png",
            auc_plot=tmp_path / "slide_timeseries_auc.png",
            fit_plots=[
                tmp_path / "slide_timeseries_intensity_offset.png",
                tmp_path / "slide_timeseries_protein_lifetime.png",
                tmp_path / "slide_timeseries_mrna_lifetime.png",
                tmp_path / "slide_timeseries_expression_onset.png",
                tmp_path / "slide_timeseries_expression_slope.png",
                tmp_path / "slide_timeseries_fit_traces.png",
            ],
            skipped_positions={},
        ),
    )

    analyze.cli(workspace=tmp_path, slide=tmp_path / "slide.json", interval=10.0)

    captured = capsys.readouterr()
    assert "Completed analysis: 2 timeseries CSVs, 1 AUC CSV, 1 fit CSV, and 8 plots." in captured.err
