#!/usr/bin/env bash
# Publish a packed notebooks tree to branch `notebooks` (export artifact only).
# Pack from a monorepo checkout of main; this script never packs.
# Usage: scripts/publish-notebooks-branch.sh [--dry-run] [--tag] <zip-or-dir>
# Production notebooks-release calls this with --tag so notebooks-vX.Y.Z lands on
# the export commit (not a main SHA). CI uses --dry-run (optionally --tag).
# Prints the export commit SHA on stdout.

set -euo pipefail

DRY_RUN=0
CREATE_TAG=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --tag)
      CREATE_TAG=1
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown flag: $1" >&2
      echo "Usage: scripts/publish-notebooks-branch.sh [--dry-run] [--tag] <zip-or-dir>" >&2
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/publish-notebooks-branch.sh [--dry-run] [--tag] <zip-or-dir>" >&2
  exit 1
fi

SRC="$1"
if [[ ! -e "$SRC" ]]; then
  echo "Missing packed zip or directory: $SRC" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

TREE="$WORKDIR/tree"
mkdir -p "$TREE"

if [[ -f "$SRC" ]]; then
  case "$SRC" in
    *.zip)
      unzip -q "$SRC" -d "$WORKDIR/unzipped"
      top=()
      while IFS= read -r -d '' path; do
        top+=("$path")
      done < <(find "$WORKDIR/unzipped" -mindepth 1 -maxdepth 1 -print0)
      if [[ ${#top[@]} -ne 1 || ! -d "${top[0]}" ]]; then
        echo "Zip must contain a single top-level folder (lisca-notebooks-X.Y.Z/)." >&2
        find "$WORKDIR/unzipped" -mindepth 1 -maxdepth 1 >&2 || true
        exit 1
      fi
      cp -a "${top[0]}/." "$TREE/"
      ;;
    *)
      echo "Expected a .zip file or a directory: $SRC" >&2
      exit 1
      ;;
  esac
elif [[ -d "$SRC" ]]; then
  cp -a "$SRC/." "$TREE/"
else
  echo "Expected a .zip file or a directory: $SRC" >&2
  exit 1
fi

required=(
  VERSION
  pyproject.toml
  uv.lock
  README.md
  install.sh
  install.ps1
  update.sh
  update.ps1
  notebooks/crop.ipynb
  scripts/jupyter-hub.sh
  vendor/lisca/pyproject.toml
  vendor/transfection/pyproject.toml
)
for rel in "${required[@]}"; do
  if [[ ! -e "$TREE/$rel" ]]; then
    echo "Packed tree is missing $rel" >&2
    exit 1
  fi
done

for forbidden in apps crates python/src Cargo.toml; do
  if [[ -e "$TREE/$forbidden" ]]; then
    echo "Refusing to publish monorepo path $forbidden to branch notebooks" >&2
    exit 1
  fi
done

if grep -Eiq 'git\+|github\.com/keejkrej' "$TREE/pyproject.toml" "$TREE/uv.lock" "$TREE/vendor/transfection/pyproject.toml"; then
  echo "Refusing git/GitHub sources in the notebooks export tree" >&2
  grep -nEi 'git\+|github\.com/keejkrej' "$TREE/pyproject.toml" "$TREE/uv.lock" "$TREE/vendor/transfection/pyproject.toml" >&2 || true
  exit 1
fi

VERSION="$(tr -d '[:space:]' < "$TREE/VERSION")"
if [[ ! "$VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "VERSION must be X.Y.Z; got '$VERSION'" >&2
  exit 1
fi
TAG="notebooks-v${VERSION}"

origin_url=""
if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
  server="${GITHUB_SERVER_URL:-https://github.com}"
  origin_url="${server}/${GITHUB_REPOSITORY}.git"
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    origin_url="${server/https:\/\//https://x-access-token:${GITHUB_TOKEN}@}/${GITHUB_REPOSITORY}.git"
  fi
elif git -C "$ROOT" remote get-url origin >/dev/null 2>&1; then
  origin_url="$(git -C "$ROOT" remote get-url origin)"
fi

REPO="$WORKDIR/repo"
mkdir -p "$REPO"
git -C "$REPO" init -q
git -C "$REPO" checkout --orphan notebooks
git -C "$REPO" config user.name "${GIT_AUTHOR_NAME:-github-actions[bot]}"
git -C "$REPO" config user.email "${GIT_AUTHOR_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"

if [[ "$DRY_RUN" -eq 0 && -n "$origin_url" ]]; then
  git -C "$REPO" remote add origin "$origin_url"
  if git -C "$REPO" ls-remote --heads origin notebooks | grep -q 'refs/heads/notebooks'; then
    git -C "$REPO" fetch --depth=1 origin notebooks
    git -C "$REPO" checkout -B notebooks FETCH_HEAD
    git -C "$REPO" rm -rf --quiet . >/dev/null
  fi
fi

cp -a "$TREE/." "$REPO/"
# Keep .venv / .uv / .tools / sibling *.bak-* backups untracked on the export branch.
if [[ ! -f "$REPO/.gitignore" ]]; then
  printf '%s\n' ".venv/" ".uv/" ".tools/" ".ipynb_checkpoints/" "__pycache__/" "*.pyc" "*.pyo" "*.bak-*" >"$REPO/.gitignore"
fi

git -C "$REPO" add -A
if git -C "$REPO" diff --cached --quiet; then
  echo "No changes to commit on branch notebooks (already at $VERSION)." >&2
else
  git -C "$REPO" commit -qm "Export notebooks ${VERSION}"
fi

if [[ "$CREATE_TAG" -eq 1 ]]; then
  git -C "$REPO" tag -a "$TAG" -m "Notebooks ${VERSION}"
fi

sha="$(git -C "$REPO" rev-parse HEAD)"
echo "Export commit ${sha} (${TAG})" >&2
git -C "$REPO" log -1 --stat >&2

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry-run: not pushing branch notebooks or tag ${TAG}." >&2
  echo "$sha"
  exit 0
fi

if [[ -z "$origin_url" ]]; then
  echo "No git origin (set GITHUB_REPOSITORY or origin remote) to push branch notebooks." >&2
  exit 1
fi

if [[ -z "$(git -C "$REPO" remote)" ]]; then
  git -C "$REPO" remote add origin "$origin_url"
fi

if [[ "$CREATE_TAG" -eq 1 ]]; then
  if git -C "$REPO" ls-remote --tags origin "refs/tags/${TAG}" | grep -q "refs/tags/${TAG}"; then
    echo "Tag ${TAG} already exists on origin. Never reuse a notebooks tag." >&2
    exit 1
  fi
fi

git -C "$REPO" push origin HEAD:refs/heads/notebooks
if [[ "$CREATE_TAG" -eq 1 ]]; then
  git -C "$REPO" push origin "refs/tags/${TAG}"
fi

echo "$sha"
