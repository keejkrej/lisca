#!/usr/bin/env bash
# Pack notebooks/ into lisca-notebooks-X.Y.Z.zip (folder inside matches that name).
# Usage: scripts/pack-notebooks.sh [output-dir]
# Prints the zip path on stdout.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_SRC="$ROOT/notebooks"
VERSION_FILE="$BUNDLE_SRC/VERSION"
PYPROJECT="$BUNDLE_SRC/pyproject.toml"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "Missing $VERSION_FILE" >&2
  exit 1
fi
if [[ ! -f "$PYPROJECT" ]]; then
  echo "Missing $PYPROJECT" >&2
  exit 1
fi

VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
if [[ ! "$VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "notebooks/VERSION must be X.Y.Z; got '$VERSION'" >&2
  exit 1
fi

pyproject_version="$(
  awk '
    /^version[[:space:]]*=/ {
      if (match($0, /"[^"]+"/)) {
        print substr($0, RSTART + 1, RLENGTH - 2)
        exit
      }
    }
  ' "$PYPROJECT"
)"
if [[ "$pyproject_version" != "$VERSION" ]]; then
  echo "pyproject.toml version '$pyproject_version' does not match notebooks/VERSION '$VERSION'" >&2
  exit 1
fi

NAME="lisca-notebooks-${VERSION}"
OUT_DIR="${1:-$ROOT/dist}"
mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"
ZIP_PATH="$OUT_DIR/${NAME}.zip"

required=(
  "$BUNDLE_SRC/README.md"
  "$BUNDLE_SRC/VERSION"
  "$BUNDLE_SRC/pyproject.toml"
  "$BUNDLE_SRC/uv.lock"
  "$BUNDLE_SRC/install.sh"
  "$BUNDLE_SRC/install.ps1"
  "$BUNDLE_SRC/notebooks/crop.ipynb"
  "$BUNDLE_SRC/notebooks/analyze.ipynb"
  "$BUNDLE_SRC/notebooks/results.ipynb"
  "$BUNDLE_SRC/scripts/jupyter-hub.sh"
  "$BUNDLE_SRC/scripts/jupyter-hub.ps1"
  "$BUNDLE_SRC/scripts/jupyter-notebook.sh"
  "$BUNDLE_SRC/scripts/jupyter-notebook.ps1"
)
for path in "${required[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "Missing bundle file: $path" >&2
    exit 1
  fi
done

STAGING="$(mktemp -d)"
cleanup() {
  rm -rf "$STAGING"
}
trap cleanup EXIT

DEST="$STAGING/$NAME"
mkdir -p "$DEST/notebooks" "$DEST/scripts"
cp "$BUNDLE_SRC/README.md" "$DEST/README.md"
cp "$BUNDLE_SRC/VERSION" "$DEST/VERSION"
cp "$BUNDLE_SRC/pyproject.toml" "$DEST/pyproject.toml"
cp "$BUNDLE_SRC/uv.lock" "$DEST/uv.lock"
cp "$BUNDLE_SRC/install.sh" "$DEST/install.sh"
cp "$BUNDLE_SRC/install.ps1" "$DEST/install.ps1"
cp "$BUNDLE_SRC/notebooks/crop.ipynb" "$DEST/notebooks/crop.ipynb"
cp "$BUNDLE_SRC/notebooks/analyze.ipynb" "$DEST/notebooks/analyze.ipynb"
cp "$BUNDLE_SRC/notebooks/results.ipynb" "$DEST/notebooks/results.ipynb"
cp "$BUNDLE_SRC/scripts/jupyter-hub.sh" "$DEST/scripts/jupyter-hub.sh"
cp "$BUNDLE_SRC/scripts/jupyter-hub.ps1" "$DEST/scripts/jupyter-hub.ps1"
cp "$BUNDLE_SRC/scripts/jupyter-notebook.sh" "$DEST/scripts/jupyter-notebook.sh"
cp "$BUNDLE_SRC/scripts/jupyter-notebook.ps1" "$DEST/scripts/jupyter-notebook.ps1"
chmod +x "$DEST/install.sh" "$DEST/scripts/"*.sh

# Guard: this zip is the notebook env, not the monorepo or Studio.
if [[ -e "$DEST/python" || -e "$DEST/apps" || -e "$DEST/crates" ]]; then
  echo "Refusing to pack monorepo paths into the notebooks zip." >&2
  exit 1
fi

rm -f "$ZIP_PATH"
(
  cd "$STAGING"
  zip -r -X "$ZIP_PATH" "$NAME"
) >&2

expected=(
  "$NAME/README.md"
  "$NAME/VERSION"
  "$NAME/pyproject.toml"
  "$NAME/uv.lock"
  "$NAME/install.sh"
  "$NAME/install.ps1"
  "$NAME/notebooks/crop.ipynb"
  "$NAME/notebooks/analyze.ipynb"
  "$NAME/notebooks/results.ipynb"
  "$NAME/scripts/jupyter-hub.sh"
  "$NAME/scripts/jupyter-hub.ps1"
  "$NAME/scripts/jupyter-notebook.sh"
  "$NAME/scripts/jupyter-notebook.ps1"
)
listing="$(unzip -Z1 "$ZIP_PATH")"
for path in "${expected[@]}"; do
  if ! grep -Fxq "$path" <<<"$listing"; then
    echo "Zip is missing $path" >&2
    unzip -Z1 "$ZIP_PATH" >&2 || true
    exit 1
  fi
done
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  [[ "$path" == "$NAME" || "$path" == "$NAME/" ]] && continue
  [[ "$path" == "$NAME/notebooks/" || "$path" == "$NAME/scripts/" ]] && continue
  ok=0
  for exp in "${expected[@]}"; do
    if [[ "$path" == "$exp" || "$path" == "$exp/" ]]; then
      ok=1
      break
    fi
  done
  if [[ "$ok" -ne 1 ]]; then
    echo "Zip contains unexpected path: $path" >&2
    exit 1
  fi
done <<<"$listing"

echo "Packed $ZIP_PATH" >&2
echo "$ZIP_PATH"
