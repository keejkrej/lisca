from __future__ import annotations

import sys
from collections.abc import Callable, Sequence

from .expression import compare_timeseries, roi_bbox_timeseries


CommandHandler = Callable[[list[str]], None]

COMMANDS: dict[tuple[str, str], CommandHandler] = {
    ("expression", "roi-bbox-timeseries"): lambda argv: roi_bbox_timeseries.main(
        argv,
        prog_name="delivery expression roi-bbox-timeseries",
    ),
    ("expression", "compare-timeseries"): lambda argv: compare_timeseries.main(
        argv,
        prog_name="delivery expression compare-timeseries",
    ),
}


def _usage() -> str:
    return "\n".join(
        [
            "Usage: delivery <workflow> <command> [args...]",
            "",
            "Commands:",
            "  delivery expression roi-bbox-timeseries",
            "  delivery expression compare-timeseries",
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
        print(f"Unknown delivery command: {' '.join(command_key)}", file=sys.stderr)
        print(_usage(), file=sys.stderr)
        raise SystemExit(2)

    command(args[2:])
