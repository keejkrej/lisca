from __future__ import annotations

from collections.abc import Sequence

import typer

from . import correlation
from .bf_class import cli as bf_class_cli
from .bf_seg import cli as bf_seg_cli
from .stain import detect_spikes, nd2_roi_timeseries, plot_traces


app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help="Apoptosis analysis workflows.",
)

stain_app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help="Stain ROI timeseries, event detection, and plotting workflows.",
)

bf_seg_app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help="Bright-field segmentation workflows.",
)


stain_app.command(name="extract-timeseries")(nd2_roi_timeseries.cli)
stain_app.command(name="detect-events")(detect_spikes.cli)
stain_app.command(name="plot-timeseries")(plot_traces.cli)


@bf_seg_app.command(
    name="convert-dataset",
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True, "help_option_names": []},
)
def bf_seg_convert_dataset(ctx: typer.Context) -> None:
    bf_seg_cli.convert_dataset_main(list(ctx.args))


@bf_seg_app.command(
    name="train",
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True, "help_option_names": []},
)
def bf_seg_train(ctx: typer.Context) -> None:
    bf_seg_cli.train_main(list(ctx.args))


@bf_seg_app.command(
    name="infer",
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True, "help_option_names": []},
)
def bf_seg_infer(ctx: typer.Context) -> None:
    bf_seg_cli.infer_main(list(ctx.args))


@bf_seg_app.command(
    name="plot",
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True, "help_option_names": []},
)
def bf_seg_plot(ctx: typer.Context) -> None:
    bf_seg_cli.plot_main(list(ctx.args))


app.add_typer(bf_class_cli.app, name="bf-class")
app.add_typer(bf_seg_app, name="bf-seg")
app.add_typer(stain_app, name="stain")
app.add_typer(correlation.app, name="correlation")


def main(argv: Sequence[str] | None = None) -> None:
    if argv is None:
        app(prog_name="apoptosis")
        return
    app(args=list(argv), prog_name="apoptosis", standalone_mode=False)
