"""Workspace compatibility migrations.

Ordered, idempotent rewrites of on-disk workspace files so live parsers can
stay strict. Call :func:`migrate_workspace` once when a tool opens a workspace,
before any bbox read or write.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from lisca.migrations.bbox_crop_to_roi import migrate_bbox_crop_to_roi

Migration = Callable[[Path], list[str]]

MIGRATIONS: tuple[Migration, ...] = (migrate_bbox_crop_to_roi,)


def migrate_workspace(workspace: Path) -> list[str]:
    """Run registered workspace migrations in order.

    Returns paths that were rewritten. A second call is a no-op.
    """
    rewritten: list[str] = []
    workspace = workspace.expanduser().resolve()
    for migration in MIGRATIONS:
        rewritten.extend(migration(workspace))
    return rewritten


__all__ = ["MIGRATIONS", "migrate_workspace"]
