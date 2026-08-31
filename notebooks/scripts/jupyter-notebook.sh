#!/usr/bin/env bash
# Start Jupyter in the notebooks/ folder (local laptop).
# JupyterHub: use scripts/jupyter-hub.sh instead (do not start a second server).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/../pyproject.toml" ]]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [[ -f "$SCRIPT_DIR/pyproject.toml" ]]; then
  REPO_ROOT="$SCRIPT_DIR"
else
  echo "Run this script from the extracted lisca-notebooks folder (next to pyproject.toml)." >&2
  exit 1
fi

if [[ -x "$REPO_ROOT/.uv/uv.exe" ]]; then
  UV_EXE="$REPO_ROOT/.uv/uv.exe"
elif [[ -x "$REPO_ROOT/.uv/uv" ]]; then
  UV_EXE="$REPO_ROOT/.uv/uv"
elif command -v uv >/dev/null 2>&1; then
  UV_EXE="uv"
else
  echo "Neither $REPO_ROOT/.uv/uv.exe, $REPO_ROOT/.uv/uv, nor uv on PATH was found. Run install.sh or install uv." >&2
  exit 1
fi

NOTEBOOKS_DIR="$REPO_ROOT/notebooks"
if [[ ! -d "$NOTEBOOKS_DIR" ]]; then
  echo "Notebooks folder not found: $NOTEBOOKS_DIR" >&2
  exit 1
fi

cd "$REPO_ROOT"
exec "$UV_EXE" run --python 3.12 --extra notebook jupyter notebook "$NOTEBOOKS_DIR"
