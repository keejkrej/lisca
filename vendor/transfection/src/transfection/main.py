from __future__ import annotations

from collections.abc import Sequence

from transfection import commands as _commands  # noqa: F401 — register CLI commands
from transfection.app import app
from transfection.core.constants import PROG_NAME
from transfection.utils.argv import normalize_argv


def main(argv: Sequence[str] | None = None) -> None:
    app(args=normalize_argv(argv), prog_name=PROG_NAME)
