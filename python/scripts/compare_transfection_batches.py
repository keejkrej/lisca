"""Offline comparison of two finished transfection workspaces.

Run from python/:

    uv run python scripts/compare_transfection_batches.py A B --out comparison
"""

from __future__ import annotations

from lisca.compare_batches import main

if __name__ == "__main__":
    raise SystemExit(main())
