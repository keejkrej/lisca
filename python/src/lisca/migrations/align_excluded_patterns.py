"""Rewrite align state keys that named a Pattern a "cell".

``align/Pos{n}.json``: top-level ``excludedCells`` → ``excludedPatterns``, and
``grid.cellWidth`` / ``grid.cellHeight`` → ``grid.patternWidth`` /
``grid.patternHeight``. A file carrying both the old and the new name of a key
is an error.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from lisca.core.paths import POS_PREFIX, align_dir, align_json_name

_TOP_LEVEL_RENAMES: tuple[tuple[str, str], ...] = (
    ("excludedCells", "excludedPatterns"),
)
_GRID_RENAMES: tuple[tuple[str, str], ...] = (
    ("cellWidth", "patternWidth"),
    ("cellHeight", "patternHeight"),
)


def migrate_align_excluded_patterns(workspace: Path) -> list[str]:
    """Rewrite cell-named keys on ``align/Pos*.json``. Returns rewritten paths."""
    rewritten: list[str] = []
    for path in _align_json_paths(workspace):
        if _migrate_align_file(path):
            rewritten.append(str(path))
    return rewritten


def _align_json_paths(workspace: Path) -> list[Path]:
    directory = align_dir(workspace)
    if not directory.is_dir():
        return []
    paths: list[Path] = []
    for path in sorted(directory.glob(f"{POS_PREFIX}*.json")):
        if not path.is_file():
            continue
        suffix = path.stem.removeprefix(POS_PREFIX)
        if suffix.isdigit() and path.name == align_json_name(int(suffix)):
            paths.append(path)
    return paths


def _migrate_align_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError(f"Align state is not a JSON object: {path}")

    changed = _rename_keys(data, _TOP_LEVEL_RENAMES, "", path)
    grid = data.get("grid")
    if isinstance(grid, dict):
        changed = _rename_keys(grid, _GRID_RENAMES, "grid.", path) or changed
    if not changed:
        return False

    new_text = json.dumps(data, indent=2)
    if text.endswith("\n"):
        new_text += "\n"
    _atomic_write_text(path, new_text)
    return True


def _rename_keys(
    data: dict[str, Any],
    renames: tuple[tuple[str, str], ...],
    prefix: str,
    path: Path,
) -> bool:
    changed = False
    for old, new in renames:
        if old not in data:
            continue
        if new in data:
            raise ValueError(
                f"Align state has both `{prefix}{old}` and `{prefix}{new}`: {path}"
            )
        # Rebuild in place so the renamed key keeps its position.
        items = [(new if key == old else key, value) for key, value in data.items()]
        data.clear()
        data.update(items)
        changed = True
    return changed


def _atomic_write_text(path: Path, text: str) -> None:
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
        os.replace(tmp_path, path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise
