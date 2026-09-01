#!/usr/bin/env bash
# Pack notebooks/ into lisca-notebooks-X.Y.Z.zip (folder inside matches that name).
# Vendors lisca[crop] + transfection as path sources so install only talks to PyPI.
# Usage: scripts/pack-notebooks.sh [output-dir]
# Prints the zip path on stdout. Pack from a main monorepo checkout.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_SRC="$ROOT/notebooks"
VERSION_FILE="$BUNDLE_SRC/VERSION"
PYPROJECT="$BUNDLE_SRC/pyproject.toml"
SYNC="$ROOT/scripts/sync-notebooks-vendor.sh"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "Missing $VERSION_FILE" >&2
  exit 1
fi
if [[ ! -f "$PYPROJECT" ]]; then
  echo "Missing $PYPROJECT" >&2
  exit 1
fi
if [[ ! -f "$SYNC" ]]; then
  echo "Missing $SYNC" >&2
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

bash "$SYNC"

assert_no_git_sources() {
  local file="$1"
  if grep -Eiq 'git\+|github\.com/keejkrej' "$file"; then
    echo "Refusing git/GitHub sources in $file (zip must vendor lisca + transfection):" >&2
    grep -nEi 'git\+|github\.com/keejkrej' "$file" >&2 || true
    exit 1
  fi
}

assert_no_git_sources "$PYPROJECT"
assert_no_git_sources "$BUNDLE_SRC/uv.lock"

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
  "$BUNDLE_SRC/update.sh"
  "$BUNDLE_SRC/update.ps1"
  "$BUNDLE_SRC/notebooks/crop.ipynb"
  "$BUNDLE_SRC/notebooks/analyze.ipynb"
  "$BUNDLE_SRC/notebooks/results.ipynb"
  "$BUNDLE_SRC/scripts/jupyter-hub.sh"
  "$BUNDLE_SRC/scripts/jupyter-hub.ps1"
  "$BUNDLE_SRC/scripts/jupyter-notebook.sh"
  "$BUNDLE_SRC/scripts/jupyter-notebook.ps1"
  "$BUNDLE_SRC/vendor/README.md"
  "$BUNDLE_SRC/vendor/lisca/pyproject.toml"
  "$BUNDLE_SRC/vendor/lisca/src/lisca/services/crop.py"
  "$BUNDLE_SRC/vendor/transfection/pyproject.toml"
  "$BUNDLE_SRC/vendor/transfection/src/transfection/__init__.py"
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
mkdir -p "$DEST/notebooks" "$DEST/scripts" "$DEST/vendor"
cp "$BUNDLE_SRC/README.md" "$DEST/README.md"
cp "$BUNDLE_SRC/VERSION" "$DEST/VERSION"
cp "$BUNDLE_SRC/pyproject.toml" "$DEST/pyproject.toml"
cp "$BUNDLE_SRC/uv.lock" "$DEST/uv.lock"
cp "$BUNDLE_SRC/install.sh" "$DEST/install.sh"
cp "$BUNDLE_SRC/install.ps1" "$DEST/install.ps1"
cp "$BUNDLE_SRC/update.sh" "$DEST/update.sh"
cp "$BUNDLE_SRC/update.ps1" "$DEST/update.ps1"
# Export gitignore: keep venv/tools untracked, and sibling update backups (*.bak-*).
# Backups stay next to the templates, not in a separate backup directory.
printf '%s\n' ".venv/" ".uv/" ".tools/" ".ipynb_checkpoints/" "__pycache__/" "*.pyc" "*.pyo" "*.bak-*" >"$DEST/.gitignore"
cp "$BUNDLE_SRC/notebooks/crop.ipynb" "$DEST/notebooks/crop.ipynb"
cp "$BUNDLE_SRC/notebooks/analyze.ipynb" "$DEST/notebooks/analyze.ipynb"
cp "$BUNDLE_SRC/notebooks/results.ipynb" "$DEST/notebooks/results.ipynb"
cp "$BUNDLE_SRC/scripts/jupyter-hub.sh" "$DEST/scripts/jupyter-hub.sh"
cp "$BUNDLE_SRC/scripts/jupyter-hub.ps1" "$DEST/scripts/jupyter-hub.ps1"
cp "$BUNDLE_SRC/scripts/jupyter-notebook.sh" "$DEST/scripts/jupyter-notebook.sh"
cp "$BUNDLE_SRC/scripts/jupyter-notebook.ps1" "$DEST/scripts/jupyter-notebook.ps1"
cp "$BUNDLE_SRC/vendor/README.md" "$DEST/vendor/README.md"
cp -a "$BUNDLE_SRC/vendor/lisca" "$DEST/vendor/lisca"
cp -a "$BUNDLE_SRC/vendor/transfection" "$DEST/vendor/transfection"
chmod +x "$DEST/install.sh" "$DEST/update.sh" "$DEST/scripts/"*.sh

find "$DEST" -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
find "$DEST" -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete

# Guard: this zip is the notebook env, not the monorepo or Studio.
# vendor/lisca is a copy of python/, not a zip-root python/ tree.
if [[ -e "$DEST/python" || -e "$DEST/apps" || -e "$DEST/crates" ]]; then
  echo "Refusing to pack monorepo paths into the notebooks zip." >&2
  exit 1
fi
if [[ -e "$DEST/vendor/transfection/crates" || -e "$DEST/vendor/lisca/crates" ]]; then
  echo "Refusing to pack sidecar Rust crates into the notebooks zip." >&2
  exit 1
fi
if [[ -n "$(find "$DEST" -name '*.onnx' -print -quit)" ]]; then
  echo "Refusing to pack ONNX weights into the notebooks zip." >&2
  exit 1
fi

assert_no_git_sources "$DEST/pyproject.toml"
assert_no_git_sources "$DEST/uv.lock"
assert_no_git_sources "$DEST/vendor/lisca/pyproject.toml"
assert_no_git_sources "$DEST/vendor/transfection/pyproject.toml"

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
  "$NAME/update.sh"
  "$NAME/update.ps1"
  "$NAME/.gitignore"
  "$NAME/notebooks/crop.ipynb"
  "$NAME/notebooks/analyze.ipynb"
  "$NAME/notebooks/results.ipynb"
  "$NAME/scripts/jupyter-hub.sh"
  "$NAME/scripts/jupyter-hub.ps1"
  "$NAME/scripts/jupyter-notebook.sh"
  "$NAME/scripts/jupyter-notebook.ps1"
  "$NAME/vendor/README.md"
  "$NAME/vendor/lisca/pyproject.toml"
  "$NAME/vendor/lisca/src/lisca/services/crop.py"
  "$NAME/vendor/transfection/pyproject.toml"
  "$NAME/vendor/transfection/src/transfection/__init__.py"
)

is_expected_exact() {
  local path="$1"
  local exp
  for exp in "${expected[@]}"; do
    if [[ "$path" == "$exp" || "$path" == "$exp/" ]]; then
      return 0
    fi
  done
  return 1
}

is_allowed_vendor_path() {
  local path="$1"
  case "$path" in
    "$NAME/vendor" | "$NAME/vendor/" | "$NAME/vendor/README.md")
      return 0
      ;;
    "$NAME/vendor/lisca" | "$NAME/vendor/lisca/"*)
      return 0
      ;;
    "$NAME/vendor/transfection" | "$NAME/vendor/transfection/"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

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
  if is_expected_exact "$path"; then
    continue
  fi
  if is_allowed_vendor_path "$path"; then
    case "$path" in
      *.onnx | */crates/* | */apps/* | */Cargo.toml | */Cargo.lock)
        echo "Zip contains unexpected path: $path" >&2
        exit 1
        ;;
    esac
    continue
  fi
  echo "Zip contains unexpected path: $path" >&2
  exit 1
done <<<"$listing"

echo "Packed $ZIP_PATH" >&2
echo "$ZIP_PATH"
