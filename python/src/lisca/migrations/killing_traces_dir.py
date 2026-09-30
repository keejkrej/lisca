"""Rename the killing assay's ``timeseries/`` directory to ``traces/``."""

from __future__ import annotations

import shutil
from pathlib import Path

_OLD_DIR = "timeseries"
_NEW_DIR = "traces"


def migrate_killing_traces_dir(workspace: Path) -> list[str]:
    """Move ``<workspace>/timeseries/`` to ``<workspace>/traces/``.

    Returns ``[traces dir]`` when the workspace changed, ``[]`` otherwise.
    """
    old = workspace / _OLD_DIR
    new = workspace / _NEW_DIR
    if not old.is_dir():
        return []
    if not new.exists():
        old.rename(new)
        return [str(new)]
    if not new.is_dir():
        raise ValueError(f"cannot migrate {old}: {new} exists and is not a directory")
    if _is_empty_tree(old) or _same_tree(old, new):
        shutil.rmtree(old)
        return [str(new)]
    raise ValueError(
        f"both {old} and {new} exist with different contents; "
        f"merge them into {new} and remove {old}"
    )


def _is_empty_tree(root: Path) -> bool:
    return not any(path.is_file() for path in root.rglob("*"))


def _files(root: Path) -> dict[Path, Path]:
    return {path.relative_to(root): path for path in root.rglob("*") if path.is_file()}


def _same_tree(left: Path, right: Path) -> bool:
    left_files = _files(left)
    right_files = _files(right)
    if left_files.keys() != right_files.keys():
        return False
    return all(
        left_files[rel].read_bytes() == right_files[rel].read_bytes()
        for rel in left_files
    )
