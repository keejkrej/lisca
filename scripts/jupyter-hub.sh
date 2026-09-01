#!/usr/bin/env bash
# Register the Lisca kernel for JupyterHub.
# Does not start a notebook server: Hub already serves the UI.

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

NOTEBOOKS_DIR="$REPO_ROOT/notebooks"
if [[ ! -d "$NOTEBOOKS_DIR" ]]; then
  echo "Notebooks folder not found: $NOTEBOOKS_DIR" >&2
  exit 1
fi

export UV_PYTHON_INSTALL_DIR="$REPO_ROOT/.uv/python"
export UV_CACHE_DIR="$REPO_ROOT/.uv/cache"
export UV_TOOL_DIR="$REPO_ROOT/.uv/tools"
export UV_PYTHON_BIN_DIR="$REPO_ROOT/.uv/bin"

detect_uv() {
  if [[ -x "$REPO_ROOT/.uv/uv.exe" ]]; then
    UV_EXE="$REPO_ROOT/.uv/uv.exe"
  elif [[ -x "$REPO_ROOT/.uv/uv" ]]; then
    UV_EXE="$REPO_ROOT/.uv/uv"
  elif command -v uv >/dev/null 2>&1; then
    UV_EXE="uv"
  else
    UV_EXE=""
  fi
}

has_venv() {
  [[ -x "$REPO_ROOT/.venv/bin/python" || -x "$REPO_ROOT/.venv/Scripts/python.exe" ]]
}

detect_uv

if [[ -z "$UV_EXE" ]] || ! has_venv; then
  INSTALL_SH=""
  if [[ -f "$SCRIPT_DIR/install.sh" ]]; then
    INSTALL_SH="$SCRIPT_DIR/install.sh"
  elif [[ -f "$REPO_ROOT/scripts/install.sh" ]]; then
    INSTALL_SH="$REPO_ROOT/scripts/install.sh"
  elif [[ -f "$REPO_ROOT/install.sh" ]]; then
    INSTALL_SH="$REPO_ROOT/install.sh"
  fi
  if [[ -n "$INSTALL_SH" ]]; then
    echo "Setting up the environment (first run)..."
    # install.sh pauses when stdin is a terminal; keep going after setup.
    bash "$INSTALL_SH" </dev/null
  elif [[ -n "$UV_EXE" ]]; then
    echo "Setting up the environment (first run)..."
    "$UV_EXE" sync --python 3.12 --extra notebook --directory "$REPO_ROOT"
  else
    echo "Neither $REPO_ROOT/.uv/uv.exe, $REPO_ROOT/.uv/uv, nor uv on PATH was found. Run install.sh or install uv." >&2
    exit 1
  fi
  detect_uv
  if [[ -z "$UV_EXE" ]]; then
    echo "uv is still missing after install. Run install.sh or install uv." >&2
    exit 1
  fi
fi

link_repo_in_home() {
  local name link_path home_resolved repo_parent
  name="$(basename -- "$REPO_ROOT")"
  home_resolved="$(cd "$HOME" && pwd)"
  repo_parent="$(cd "$(dirname -- "$REPO_ROOT")" && pwd)"
  HOME_LINK_NAME="$name"
  HOME_LINK_KIND=""

  if [[ "$REPO_ROOT" == "$home_resolved" || "$repo_parent" == "$home_resolved" ]]; then
    HOME_LINK_KIND="visible"
    return 0
  fi

  link_path="$home_resolved/$name"
  if [[ -d "$link_path" && ! -L "$link_path" ]]; then
    echo "Warning: $link_path already exists as a directory; not replacing it with a symlink to $REPO_ROOT." >&2
    return 0
  fi
  ln -sfn "$REPO_ROOT" "$link_path"
  HOME_LINK_KIND="symlink"
}

cd "$REPO_ROOT"
echo "Registering the Lisca kernel..."
"$UV_EXE" run --python 3.12 --extra notebook python -m ipykernel install --user --name lisca --display-name "Lisca"

HOME_LINK_NAME=""
HOME_LINK_KIND=""
link_repo_in_home

echo ""
echo "Done. Next steps:"
echo "  1. Refresh the browser tab (or open JupyterHub again)."
if [[ "$HOME_LINK_KIND" == "symlink" ]]; then
  echo "  2. In the file tree, open ~/$HOME_LINK_NAME (symlink to the code folder)."
  echo "  3. Open notebooks/crop.ipynb (then analyze.ipynb, then results.ipynb)."
  echo "  4. Kernel menu: pick Lisca if it is not already selected."
  echo "  5. In the Config cell, set WORKSPACE and SOURCE to the mounted data folder."
else
  echo "  2. Open notebooks/crop.ipynb (then analyze.ipynb, then results.ipynb)."
  echo "  3. Kernel menu: pick Lisca if it is not already selected."
  echo "  4. In the Config cell, set WORKSPACE and SOURCE to the mounted data folder."
fi
