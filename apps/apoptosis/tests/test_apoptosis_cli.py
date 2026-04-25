from __future__ import annotations

from typer.testing import CliRunner

from apoptosis import cli


runner = CliRunner()


def test_root_help_lists_grouped_commands() -> None:
    result = runner.invoke(cli.app, ["--help"], prog_name="apoptosis")

    assert result.exit_code == 0
    assert "bf-class" in result.output
    assert "stain" in result.output
    assert "correlation" in result.output


def test_bf_class_detect_events_help_uses_new_name() -> None:
    result = runner.invoke(
        cli.app,
        ["bf-class", "detect-events", "--help"],
        prog_name="apoptosis",
    )

    assert result.exit_code == 0
    assert "apoptosis bf-class detect-events" in result.output
    assert "--output-csv" in result.output


def test_bf_class_old_events_command_fails() -> None:
    result = runner.invoke(cli.app, ["bf-class", "events", "--help"], prog_name="apoptosis")

    assert result.exit_code != 0


def test_bf_class_plot_scores_uses_output_plot() -> None:
    result = runner.invoke(
        cli.app,
        ["bf-class", "plot-scores", "--help"],
        prog_name="apoptosis",
    )

    assert result.exit_code == 0
    assert "--output-plot" in result.output
    assert "--output-png" not in result.output


def test_stain_extract_timeseries_help_uses_new_name() -> None:
    result = runner.invoke(
        cli.app,
        ["stain", "extract-timeseries", "--help"],
        prog_name="apoptosis",
    )

    assert result.exit_code == 0
    assert "apoptosis stain extract-timeseries" in result.output


def test_stain_detect_events_help_uses_event_language() -> None:
    result = runner.invoke(
        cli.app,
        ["stain", "detect-events", "--help"],
        prog_name="apoptosis",
    )

    assert result.exit_code == 0
    assert "apoptosis stain detect-events" in result.output
    assert "event" in result.output
    assert "detection" in result.output
    assert "detect-spikes" not in result.output


def test_stain_plot_timeseries_help_uses_event_csv() -> None:
    result = runner.invoke(
        cli.app,
        ["stain", "plot-timeseries", "--help"],
        prog_name="apoptosis",
    )

    assert result.exit_code == 0
    assert "--event-csv" in result.output
    assert "--spike-csv" not in result.output


def test_correlation_plot_help_uses_event_columns() -> None:
    result = runner.invoke(
        cli.app,
        ["correlation", "plot", "--help"],
        prog_name="apoptosis",
    )

    assert result.exit_code == 0
    assert "apoptosis correlation plot" in result.output
    assert "--bf-event-column" in result.output
    assert "--stain-event-column" in result.output
    assert "--bf-column" not in result.output
    assert "--stain-column" not in result.output
