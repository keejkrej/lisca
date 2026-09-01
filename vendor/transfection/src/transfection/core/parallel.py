"""Process-pool sizing for parallel stages (matches pyama-v2)."""

from __future__ import annotations

import os


def worker_count(task_count: int) -> int:
    """Use all available cores, capped by the number of tasks."""
    return max(1, min(task_count, os.cpu_count() or 1))
