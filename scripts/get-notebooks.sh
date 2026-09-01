#!/usr/bin/env bash
# First-time notebooks get from main (curl|bash).
# If git is on PATH: clone export branch notebooks, then install.
# If git is missing: download the latest notebooks-v* zip, extract, install.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.sh | bash
#   curl ... | bash -s -- --no-install
#   curl ... | bash -s -- /path/to/lisca-notebooks
# Env: LISCA_NOTEBOOKS_DIR, GH_TOKEN / GITHUB_TOKEN (private repo).
set -euo pipefail

REPO="keejkrej/lisca"
CLONE_URL="https://github.com/${REPO}.git"
API="https://api.github.com/repos/${REPO}/releases"
NO_INSTALL=0
DEST="${LISCA_NOTEBOOKS_DIR:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-install)
      NO_INSTALL=1
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown flag: $1" >&2
      echo "Usage: get-notebooks.sh [--no-install] [dest-dir]" >&2
      exit 1
      ;;
    *)
      if [[ -n "$DEST" ]]; then
        echo "Unexpected extra argument: $1" >&2
        exit 1
      fi
      DEST="$1"
      shift
      ;;
  esac
done

DEST="${DEST:-lisca-notebooks}"

token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
auth_args=()
if [[ -n "$token" ]]; then
  auth_args=(-H "Authorization: Bearer ${token}")
  CLONE_URL="https://x-access-token:${token}@github.com/${REPO}.git"
fi

if [[ -e "$DEST" ]]; then
  echo "Destination already exists: $DEST" >&2
  echo "For updates, cd there and run bash update.sh (requires git)." >&2
  exit 1
fi

auth_note() {
  if [[ -z "$token" ]]; then
    echo "If this repo is private, set GH_TOKEN or GITHUB_TOKEN." >&2
  fi
}

print_update_needs_git() {
  echo "This zip extract is not a git checkout. update.sh requires git."
  echo "Install git, then in $DEST run: bash update.sh"
  echo "That bootstraps onto export branch notebooks (keeps .venv / .uv)."
  echo "  macOS:         xcode-select --install"
  echo "  Debian/Ubuntu: sudo apt-get update && sudo apt-get install -y git"
  echo "  Fedora:        sudo dnf install -y git"
  echo "  Windows:       winget install Git.Git   or https://git-scm.com/download/win"
}

pick_and_download_zip() {
  local json zip_url
  if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
    echo "python3 is required to pick the latest notebooks-v* release (or install git and re-run)." >&2
    exit 1
  fi
  local py
  py="$(command -v python3 || command -v python)"
  echo "Fetching latest notebooks-v* GitHub Release..."
  json="$(curl -fsSL "${auth_args[@]}" -H "Accept: application/vnd.github+json" "$API")" || {
    echo "Failed to list GitHub Releases for ${REPO}." >&2
    auth_note
    exit 1
  }
  zip_url="$(
    "$py" -c '
import json, re, sys
releases = json.load(sys.stdin)
best = None
best_key = None
for rel in releases:
    if rel.get("draft"):
        continue
    tag = rel.get("tag_name") or ""
    if not tag.startswith("notebooks-v"):
        continue
    ver = tag[len("notebooks-v"):]
    m = re.fullmatch(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", ver)
    if not m:
        continue
    key = (tuple(int(p) for p in m.groups()), rel.get("published_at") or "")
    if best is None or key > best_key:
        best, best_key = rel, key
if best is None:
    sys.stderr.write("No GitHub Release with tag notebooks-vX.Y.Z found.\n")
    sys.exit(1)
asset = None
for a in best.get("assets") or []:
    name = a.get("name") or ""
    if name.startswith("lisca-notebooks-") and name.endswith(".zip"):
        asset = a
        break
if asset is None:
    sys.stderr.write("Release %s has no lisca-notebooks-*.zip asset.\n" % best.get("tag_name"))
    sys.exit(1)
print(asset["id"])
print(asset["name"])
print(asset.get("browser_download_url") or "")
print(best.get("tag_name") or "")
' <<<"$json"
  )" || exit 1
  local asset_id zip_name zip_dl tag work
  asset_id="$(sed -n '1p' <<<"$zip_url")"
  zip_name="$(sed -n '2p' <<<"$zip_url")"
  zip_dl="$(sed -n '3p' <<<"$zip_url")"
  tag="$(sed -n '4p' <<<"$zip_url")"
  echo "Downloading ${zip_name} (${tag})..."
  work="$(mktemp -d)"
  local zip_path="$work/$zip_name"
  if [[ -n "$token" ]]; then
    curl -fsSL "${auth_args[@]}" -H "Accept: application/octet-stream" \
      -o "$zip_path" \
      "https://api.github.com/repos/${REPO}/releases/assets/${asset_id}" || {
      echo "Failed to download release asset." >&2
      auth_note
      exit 1
    }
  else
    curl -fsSL -o "$zip_path" "$zip_dl" || {
      echo "Failed to download $zip_dl." >&2
      auth_note
      exit 1
    }
  fi
  mkdir -p "$work/extracted"
  unzip -q "$zip_path" -d "$work/extracted"
  local top=()
  while IFS= read -r -d '' path; do
    top+=("$path")
  done < <(find "$work/extracted" -mindepth 1 -maxdepth 1 -print0)
  if [[ ${#top[@]} -ne 1 || ! -d "${top[0]}" ]]; then
    echo "Zip did not contain a single top-level folder." >&2
    exit 1
  fi
  mkdir -p "$(dirname "$DEST")"
  mv "${top[0]}" "$DEST"
  rm -rf "$work"
}

if command -v git >/dev/null 2>&1; then
  echo "git found; cloning export branch notebooks..."
  mkdir -p "$(dirname "$DEST")"
  git clone --branch notebooks --single-branch --depth 1 "$CLONE_URL" "$DEST" || {
    echo "Clone of branch notebooks failed." >&2
    auth_note
    echo "Airgapped: download lisca-notebooks-X.Y.Z.zip from GitHub Releases, extract, then bash install.sh." >&2
    exit 1
  }
else
  echo "git not found; downloading the latest notebooks-v* zip."
  pick_and_download_zip
  print_update_needs_git
fi

if [[ ! -f "$DEST/install.sh" || ! -f "$DEST/pyproject.toml" ]]; then
  echo "Extracted/cloned tree is missing install.sh or pyproject.toml: $DEST" >&2
  exit 1
fi

if [[ "$NO_INSTALL" -eq 0 ]]; then
  chmod +x "$DEST/install.sh" "$DEST/update.sh" "$DEST/scripts/"*.sh 2>/dev/null || true
  bash "$DEST/install.sh"
else
  echo "Skipped install (--no-install). Next: cd $DEST && bash install.sh"
fi
