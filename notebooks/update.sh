#!/usr/bin/env bash
# Pull the notebooks export branch, then refresh the Python env like install.sh.
# This folder must be a git checkout of branch notebooks — not main, not a zip extract.
set -euo pipefail

pause_to_exit() {
  if [[ -t 0 ]]; then
    read -r -p "Press Enter to exit..." _ || true
  fi
}
trap pause_to_exit EXIT

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$SCRIPT_DIR/pyproject.toml" ]]; then
  ROOT="$SCRIPT_DIR"
elif [[ -f "$SCRIPT_DIR/../pyproject.toml" ]]; then
  ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  echo "Run this script from the lisca-notebooks folder (next to pyproject.toml)." >&2
  exit 1
fi

CLONE_HINT="git clone --branch notebooks --single-branch --depth 1 https://github.com/keejkrej/lisca.git lisca-notebooks"

if [[ ! -e "$ROOT/.git" ]]; then
  echo "This folder is not a git checkout of branch notebooks." >&2
  echo "Re-clone:" >&2
  echo "  $CLONE_HINT" >&2
  echo "Or download a fresh zip from a notebooks-v* GitHub Release (airgapped / no-git)." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for update.sh. Install git, or download a fresh notebooks-v* zip." >&2
  exit 1
fi

branch="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
upstream="$(git -C "$ROOT" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)"
if [[ "$branch" != "notebooks" && "$upstream" != */notebooks ]]; then
  echo "Expected a checkout of branch notebooks (got '${branch:-detached}'${upstream:+, upstream $upstream})." >&2
  echo "update.sh does not pull main. Re-clone:" >&2
  echo "  $CLONE_HINT" >&2
  exit 1
fi

if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
  echo "Working tree is dirty. Stash or re-clone, then retry." >&2
  git -C "$ROOT" status --short >&2
  exit 1
fi

echo "Pulling branch notebooks (ff-only)..."
if ! git -C "$ROOT" pull --ff-only; then
  echo "git pull --ff-only failed (diverged from upstream). Stash/reset or re-clone:" >&2
  echo "  $CLONE_HINT" >&2
  exit 1
fi

UV_DIR="$ROOT/.uv"

case "$(uname -sm)" in
    "Linux x86_64") ARCH="x86_64-unknown-linux-gnu" ;;
    "Darwin x86_64") ARCH="x86_64-apple-darwin" ;;
    "Darwin arm64") ARCH="aarch64-apple-darwin" ;;
    *)
        echo "Unsupported platform: $(uname -sm)" >&2
        exit 1
        ;;
esac

UV_BIN="$UV_DIR/uv"
if [ ! -f "$UV_BIN" ]; then
    mkdir -p "$UV_DIR"
    TAR="uv-$ARCH.tar.gz"
    URL="https://github.com/astral-sh/uv/releases/latest/download/$TAR"
    echo "Downloading uv (latest release)..."
    curl -fsSL "$URL" -o "$UV_DIR/$TAR"
    tar -xzf "$UV_DIR/$TAR" -C "$UV_DIR" --strip-components=1
    rm "$UV_DIR/$TAR"
    chmod +x "$UV_BIN"
fi

echo "Installing Python 3.12..."
"$UV_BIN" python install 3.12

VENV_DIR="$ROOT/.venv"
VENV_PYTHON=""
if [[ -x "$VENV_DIR/bin/python" ]]; then
  VENV_PYTHON="$VENV_DIR/bin/python"
elif [[ -x "$VENV_DIR/Scripts/python.exe" ]]; then
  VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
fi
if [[ -n "$VENV_PYTHON" ]]; then
  current="$("$VENV_PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' || true)"
  if [[ "$current" != "3.12" ]]; then
    echo "Recreating venv (need Python 3.12)..."
    rm -rf "$VENV_DIR"
  fi
fi

echo "Installing notebook environment..."
"$UV_BIN" sync --python 3.12 --extra notebook --directory "$ROOT"

version="$(tr -d '[:space:]' < "$ROOT/VERSION")"
describe="$(git -C "$ROOT" describe --tags --always 2>/dev/null || true)"
echo "Done. Now at ${version}${describe:+ (${describe})}."
echo ""
echo "Config cells in notebooks/ may have changed; re-check them before running."
echo "On a laptop, start Jupyter with:"
echo "  bash scripts/jupyter-notebook.sh"
echo "On JupyterHub, register the Lisca kernel with:"
echo "  bash scripts/jupyter-hub.sh"
