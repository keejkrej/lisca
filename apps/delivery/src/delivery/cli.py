from __future__ import annotations

from collections.abc import Sequence

import typer

from .expression import auc, plot_auc, plot_timeseries, timeseries


app = typer.Typer(add_completion=False, no_args_is_help=True)
expression_app = typer.Typer(add_completion=False, no_args_is_help=True)

expression_app.command("auc")(auc.cli)
expression_app.command("plot-auc")(plot_auc.cli)
expression_app.command("plot-timeseries")(plot_timeseries.cli)
expression_app.command("timeseries")(timeseries.cli)
app.add_typer(expression_app, name="expression")


def main(argv: Sequence[str] | None = None) -> None:
    app(args=list(argv) if argv is not None else None, prog_name="delivery")
