#!/usr/bin/env bash
# Install Python 3.12 and the notebook extra. lisca[crop] and transfection are
# vendored under vendor/ (path sources). Third-party wheels come from PyPI only.
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
  echo "Run this script from the extracted lisca-notebooks folder (next to pyproject.toml)." >&2
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

echo "Done."
echo ""
echo "On a laptop, start Jupyter with:"
echo "  bash scripts/jupyter-notebook.sh"
echo "On JupyterHub, register the Lisca kernel with:"
echo "  bash scripts/jupyter-hub.sh"
