from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from delivery import cli


runner = CliRunner()


def test_expression_timeseries_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "timeseries", "--help"])

    assert result.exit_code == 0
    assert "Workspace containing" in result.output
    assert "--slide" in result.output
    assert "--channel" not in result.output
    assert "--pos" not in result.output


def test_expression_timeseries_requires_slide(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()

    result = runner.invoke(cli.app, ["expression", "timeseries", str(workspace)])

    assert result.exit_code != 0
    assert "Missing option '--slide'" in result.output
    assert "--channel" not in result.output


def test_analyze_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "analyze", "--help"])

    assert result.exit_code == 0
    assert "Usage: root expression analyze" in result.output
    assert "Run the full delivery analysis workflow" in result.output
    assert "--slide" in result.output
    assert "--interval" in result.output
    assert "--channel" not in result.output
    assert "--output-dir" not in result.output
    assert "--correction-quartile" not in result.output
    assert "--json" not in result.output


def test_slide_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["slide", "--help"])

    assert result.exit_code == 0
    assert "Interactively create a slide.json mapping" in result.output
    assert "--output" in result.output


def test_expression_auc_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "auc", "--help"])

    assert result.exit_code == 0
    assert "Usage: root expression auc" in result.output
    assert "--interval" in result.output
    assert "--output-csv" in result.output


def test_expression_fit_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "fit", "--help"])

    assert result.exit_code == 0
    assert "Usage: root expression fit" in result.output
    assert "intensity_offset" in result.output
    assert "protein_decay_rate" in result.output
    assert "mrna_decay_rate" in result.output
    assert "--interval" in result.output
    assert "--max-onset-minutes" in result.output
    assert "--jobs" in result.output
    assert "--output-csv" in result.output


def test_expression_plot_timeseries_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "plot-timeseries", "--help"])

    assert result.exit_code == 0
    assert "Usage: root expression plot-timeseries" in result.output
    assert "--columns" in result.output


def test_expression_plot_auc_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "plot-auc", "--help"])

    assert result.exit_code == 0
    assert "Usage: root expression plot-auc" in result.output
    assert "slide channel" in result.output


def test_expression_plot_fit_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "plot-fit", "--help"])

    assert result.exit_code == 0
    assert "Usage: root expression plot-fit" in result.output
    assert "Fit summary CSV" in result.output
    assert "--interval" in result.output
    assert "--output-dir" in result.output
    assert "--alpha" in result.output
    assert "--linewidth" in result.output
    assert "--color" in result.output
