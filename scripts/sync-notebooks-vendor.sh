#!/usr/bin/env bash
# Assemble notebooks/vendor/{lisca,transfection} for uv path sources.
# lisca comes from this repo's python/; transfection is fetched at the SHA
# already pinned in Cargo.lock and python/uv.lock.
# Usage: scripts/sync-notebooks-vendor.sh
# Run before `uv lock` in notebooks/ and from pack-notebooks.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="$ROOT/notebooks/vendor"
PYTHON_SRC="$ROOT/python"
SIDECAR_URL="https://github.com/keejkrej/lisca-transfection-assay.git"

extract_sidecar_sha() {
  local file="$1"
  grep -oE 'lisca-transfection-assay#[0-9a-f]{40}' "$file" | head -1 | cut -d# -f2
}

if [[ ! -f "$PYTHON_SRC/pyproject.toml" || ! -d "$PYTHON_SRC/src/lisca" ]]; then
  echo "Missing $PYTHON_SRC package tree" >&2
  exit 1
fi

python_sha="$(extract_sidecar_sha "$ROOT/python/uv.lock")"
cargo_sha="$(extract_sidecar_sha "$ROOT/Cargo.lock")"
if [[ -z "$python_sha" ]]; then
  echo "Could not read transfection SHA from python/uv.lock" >&2
  exit 1
fi
if [[ -z "$cargo_sha" ]]; then
  echo "Could not read transfection SHA from Cargo.lock" >&2
  exit 1
fi
if [[ "$python_sha" != "$cargo_sha" ]]; then
  echo "Transfection SHA mismatch: python/uv.lock=$python_sha Cargo.lock=$cargo_sha" >&2
  exit 1
fi
SHA="$python_sha"

mkdir -p "$VENDOR"

# --- lisca (crop Python from this repo) ---
rm -rf "$VENDOR/lisca"
mkdir -p "$VENDOR/lisca/src"
cp "$PYTHON_SRC/pyproject.toml" "$VENDOR/lisca/pyproject.toml"
cp "$PYTHON_SRC/README.md" "$VENDOR/lisca/README.md"
cp -a "$PYTHON_SRC/src/lisca" "$VENDOR/lisca/src/lisca"

python3 - "$VENDOR/lisca/pyproject.toml" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
headers = {
    "[tool.uv]",
    "[tool.uv.sources]",
    "[dependency-groups]",
}


def drop_sections(text: str) -> str:
    out: list[str] = []
    skipping = False
    for line in text.splitlines(keepends=True):
        stripped = line.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            skipping = stripped in headers
            if skipping:
                continue
        if skipping:
            continue
        out.append(line)
    return "".join(out)


def drop_analysis_extra(text: str) -> str:
    return "".join(
        line
        for line in text.splitlines(keepends=True)
        if not line.startswith("analysis = ")
    )


text = drop_analysis_extra(drop_sections(path.read_text(encoding="utf-8")))
path.write_text(text, encoding="utf-8")
PY

# --- transfection (sidecar Python package only; no Rust crates) ---
rm -rf "$VENDOR/transfection"
WORKDIR="$(mktemp -d)"
cleanup_fetch() {
  rm -rf "$WORKDIR"
}
trap cleanup_fetch EXIT

git -C "$WORKDIR" init -q
git -C "$WORKDIR" remote add origin "$SIDECAR_URL"
if ! git -C "$WORKDIR" fetch --depth 1 origin "$SHA" 2>/dev/null; then
  git -C "$WORKDIR" fetch origin "$SHA"
fi
git -C "$WORKDIR" checkout --detach --quiet FETCH_HEAD

if [[ ! -f "$WORKDIR/pyproject.toml" || ! -d "$WORKDIR/src/transfection" ]]; then
  echo "Sidecar checkout at $SHA is missing pyproject.toml or src/transfection" >&2
  exit 1
fi

mkdir -p "$VENDOR/transfection/src"
cp "$WORKDIR/pyproject.toml" "$VENDOR/transfection/pyproject.toml"
cp -a "$WORKDIR/src/transfection" "$VENDOR/transfection/src/transfection"
printf '%s\n' "$SHA" >"$VENDOR/transfection/.vendor-sha"

find "$VENDOR" -type d -name '__pycache__' -prune -exec rm -rf {} +
find "$VENDOR" -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete

# Refuse to vendor sidecar Rust or weights.
if [[ -e "$VENDOR/transfection/crates" || -e "$VENDOR/lisca/crates" ]]; then
  echo "Refusing to vendor Rust crates into notebooks/vendor" >&2
  exit 1
fi
if [[ -n "$(find "$VENDOR" -name '*.onnx' -print -quit)" ]]; then
  echo "Refusing to vendor ONNX weights into notebooks/vendor" >&2
  exit 1
fi

echo "Vendored lisca from python/ and transfection@$SHA into $VENDOR" >&2
