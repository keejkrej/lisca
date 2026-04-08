from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from delivery import cli


runner = CliRunner()


def test_expression_timeseries_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "timeseries", "--help"])

    assert result.exit_code == 0
    assert "Dataset root containing" in result.output
    assert "--slide" in result.output
    assert "--pos" not in result.output


def test_expression_timeseries_requires_slide(tmp_path: Path) -> None:
    dataset_root = tmp_path / "dataset"
    dataset_root.mkdir()

    result = runner.invoke(cli.app, ["expression", "timeseries", str(dataset_root), "--channel", "1"])

    assert result.exit_code != 0
    assert "Missing option '--slide'" in result.output


def test_analyze_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["analyze", "--help"])

    assert result.exit_code == 0
    assert "Run the full delivery analysis workflow" in result.output
    assert "--slide" in result.output
    assert "--interval" in result.output


def test_expression_auc_help_is_exposed() -> None:
    result = runner.invoke(cli.app, ["expression", "auc", "--help"])

    assert result.exit_code == 0
    assert "Usage: root expression auc" in result.output
    assert "--interval" in result.output
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
