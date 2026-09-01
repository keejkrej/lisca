from __future__ import annotations

from collections.abc import Sequence


def normalize_argv(argv: Sequence[str] | None) -> list[str] | None:
    return list(argv) if argv is not None else None
