"""Workspace compatibility migrations.

Ordered, idempotent rewrites of on-disk workspace files so live parsers can
stay strict. Call :func:`migrate_workspace` once when a tool opens a workspace,
before any bbox, assay.json, or traces read or write.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from lisca.migrations.assay_samples_by_name import migrate_assay_samples_by_name
from lisca.migrations.bbox_crop_to_roi import migrate_bbox_crop_to_roi
from lisca.migrations.killing_traces_dir import migrate_killing_traces_dir

Migration = Callable[[Path], list[str]]

MIGRATIONS: tuple[Migration, ...] = (
    migrate_bbox_crop_to_roi,
    migrate_assay_samples_by_name,
    migrate_killing_traces_dir,
)


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
