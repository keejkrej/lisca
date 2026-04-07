from __future__ import annotations

import sys
from collections.abc import Callable, Sequence

from .bf_class import cli as bf_class_cli
from .bf_seg import cli as bf_seg_cli
from .stain import detect_spikes, nd2_roi_timeseries, plot_traces


CommandHandler = Callable[[list[str]], None]

COMMANDS: dict[tuple[str, str], CommandHandler] = {
    ("bf-class", "convert-dataset"): lambda argv: bf_class_cli.convert_dataset_main(argv),
    ("bf-class", "train"): lambda argv: bf_class_cli.train_main(argv),
    ("bf-class", "infer"): lambda argv: bf_class_cli.infer_main(argv),
    ("bf-class", "plot"): lambda argv: bf_class_cli.plot_main(argv),
    ("bf-seg", "convert-dataset"): lambda argv: bf_seg_cli.convert_dataset_main(argv),
    ("bf-seg", "train"): lambda argv: bf_seg_cli.train_main(argv),
    ("bf-seg", "infer"): lambda argv: bf_seg_cli.infer_main(argv),
    ("bf-seg", "plot"): lambda argv: bf_seg_cli.plot_main(argv),
    ("stain", "roi-timeseries"): lambda argv: nd2_roi_timeseries.main(
        argv,
        prog_name="apoptosis stain roi-timeseries",
    ),
    ("stain", "detect-spikes"): lambda argv: detect_spikes.main(
        argv,
        prog_name="apoptosis stain detect-spikes",
    ),
    ("stain", "plot-traces"): lambda argv: plot_traces.main(
        argv,
        prog_name="apoptosis stain plot-traces",
    ),
}


def _usage() -> str:
    return "\n".join(
        [
            "Usage: apoptosis <workflow> <command> [args...]",
            "",
            "Commands:",
            "  apoptosis bf-class convert-dataset",
            "  apoptosis bf-class train",
            "  apoptosis bf-class infer",
            "  apoptosis bf-class plot",
            "  apoptosis bf-seg convert-dataset",
            "  apoptosis bf-seg train",
            "  apoptosis bf-seg infer",
            "  apoptosis bf-seg plot",
            "  apoptosis stain roi-timeseries",
            "  apoptosis stain detect-spikes",
            "  apoptosis stain plot-traces",
        ]
    )


def main(argv: Sequence[str] | None = None) -> None:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or args[0] in {"-h", "--help", "help"}:
        print(_usage())
        raise SystemExit(0)
    if len(args) < 2:
        print(_usage(), file=sys.stderr)
        raise SystemExit(2)

    command_key = (args[0], args[1])
    command = COMMANDS.get(command_key)
    if command is None:
        print(f"Unknown apoptosis command: {' '.join(command_key)}", file=sys.stderr)
        print(_usage(), file=sys.stderr)
        raise SystemExit(2)

    command(args[2:])
