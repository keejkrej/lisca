"""Check that notebook trace CSVs cover the configured assay scope."""

from __future__ import annotations

import re
from collections.abc import Iterable
from pathlib import Path

_TRACE_PATH = re.compile(r"Pos\d+/ch\d+\.csv")


def require_trace_coverage(
    workspace: Path, position_channels: Iterable[tuple[int, int]]
) -> None:
    """Refuse to analyze partial or out-of-scope trace sets in the notebooks.

    This checks file coverage, not CSV contents or provenance.
    """
    expected = {f"Pos{pos}/ch{channel}.csv" for pos, channel in position_channels}
    if not expected:
        raise ValueError("No trace positions and signal channels are configured.")

    analysis = workspace / "analysis"
    found = {
        path.relative_to(analysis).as_posix()
        for path in analysis.glob("Pos*/ch*.csv")
        if _TRACE_PATH.fullmatch(path.relative_to(analysis).as_posix())
        and path.is_file()
    }
    missing = expected - found
    extra = found - expected
    if not missing and not extra:
        return

    present = len(expected & found)
    problems = [f"Trace coverage: {present}/{len(expected)} expected CSVs."]
    if missing:
        problems.append(f"Missing: {_examples(missing)}. Finish crop and rerun Traces.")
    if extra:
        problems.append(
            f"Outside assay scope: {_examples(extra)}. "
            "Move these CSVs out of analysis/ or correct the Studio sample assignments."
        )
    raise ValueError("\n".join(problems))


def _examples(paths: set[str]) -> str:
    limit = 8
    examples = ", ".join(sorted(paths)[:limit])
    if len(paths) > limit:
        return f"{examples} (and {len(paths) - limit} more)"
    return examples
