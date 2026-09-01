#!/usr/bin/env bash
# First-time notebooks get from main (curl|bash). Always bootstraps portable Git
# under DEST/.tools/git (same idea as .uv) and clones export branch notebooks.
# Zip extract is second-class: pass --zip (or airgapped GitHub Release zip).
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.sh | bash
#   curl ... | bash -s -- --no-install
#   curl ... | bash -s -- --zip
#   curl ... | bash -s -- /path/to/lisca-notebooks
# Env: LISCA_NOTEBOOKS_DIR, GH_TOKEN / GITHUB_TOKEN (private repo).
set -euo pipefail

REPO="keejkrej/lisca"
CLONE_URL="https://github.com/${REPO}.git"
API="https://api.github.com/repos/${REPO}/releases"
NO_INSTALL=0
ZIP_MODE=0
DEST="${LISCA_NOTEBOOKS_DIR:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-install)
      NO_INSTALL=1
      shift
      ;;
    --zip)
      ZIP_MODE=1
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown flag: $1" >&2
      echo "Usage: get-notebooks.sh [--no-install] [--zip] [dest-dir]" >&2
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
  echo "For updates, cd there and run bash update.sh." >&2
  exit 1
fi

auth_note() {
  if [[ -z "$token" ]]; then
    echo "If this repo is private, set GH_TOKEN or GITHUB_TOKEN." >&2
  fi
}

# Portable Git pins. Keep in sync with get-notebooks.ps1 / notebooks/update.sh / update.ps1.
verify_sha256() {
  local file="$1" expect="$2" got=""
  if command -v sha256sum >/dev/null 2>&1; then
    got="$(sha256sum "$file" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    got="$(shasum -a 256 "$file" | awk '{print $1}')"
  else
    echo "Need sha256sum or shasum to verify portable git." >&2
    exit 1
  fi
  got="$(printf '%s' "$got" | tr '[:upper:]' '[:lower:]')"
  expect="$(printf '%s' "$expect" | tr '[:upper:]' '[:lower:]')"
  if [[ "$got" != "$expect" ]]; then
    echo "Checksum mismatch for portable git (got $got, expected $expect)." >&2
    exit 1
  fi
}

portable_git_candidates() {
  local home="$1"
  printf '%s\n' \
    "$home/cmd/git" \
    "$home/cmd/git.exe" \
    "$home/bin/git" \
    "$home/bin/git.exe" \
    "$home/mingw64/bin/git.exe"
}

portable_git_bin() {
  local home="$1" c nested=""
  while IFS= read -r c; do
    if [[ -f "$c" ]] && "$c" --version >/dev/null 2>&1; then
      printf '%s\n' "$c"
      return 0
    fi
  done < <(portable_git_candidates "$home")
  while IFS= read -r nested; do
    if [[ -n "$nested" && -f "$nested" ]] && "$nested" --version >/dev/null 2>&1; then
      printf '%s\n' "$nested"
      return 0
    fi
    break
  done < <(find "$home" -mindepth 2 -maxdepth 3 \( -name git -o -name git.exe \) -type f 2>/dev/null)
  return 1
}

extract_git_archive() {
  local archive="$1" dest="$2" work
  work="$(mktemp -d)"
  case "$archive" in
    *.zip)
      unzip -q "$archive" -d "$work"
      ;;
    *.tar.gz|*.tgz)
      tar -xzf "$archive" -C "$work"
      ;;
    *.tar.xz)
      if tar -xJf "$archive" -C "$work" 2>/dev/null; then
        :
      elif command -v python3 >/dev/null 2>&1; then
        python3 - "$archive" "$work" <<'PY'
import sys, tarfile
kw = {}
if hasattr(tarfile, "data_filter"):
    kw["filter"] = "data"
with tarfile.open(sys.argv[1]) as tf:
    tf.extractall(sys.argv[2], **kw)
PY
      else
        echo "Need tar+xz or python3 to extract portable git ($archive)." >&2
        exit 1
      fi
      ;;
    *)
      echo "Unknown portable git archive: $archive" >&2
      exit 1
      ;;
  esac
  mkdir -p "$dest"
  local top=()
  while IFS= read -r -d '' path; do
    top+=("$path")
  done < <(find "$work" -mindepth 1 -maxdepth 1 -print0)
  if [[ ${#top[@]} -eq 1 && -d "${top[0]}" ]]; then
    cp -a "${top[0]}/." "$dest/"
  else
    cp -a "$work"/. "$dest/"
  fi
  rm -rf "$work"
}

ensure_portable_git() {
  local dest="$1" bin url sha name
  if bin="$(portable_git_bin "$dest")"; then
    echo "Using portable git at $bin"
    return 0
  fi
  rm -rf "$dest"
  mkdir -p "$dest"
  case "$(uname -sm)" in
    "Linux x86_64"|"Linux amd64")
      name="git-minimal-musl-v2.55.0-linux-amd64.tar.xz"
      url="https://github.com/baulk/git-minimal/releases/download/v2.55.0/${name}"
      sha="f3b65fb7c0dda1be9623ffb9e403a5dcaeb3cc48750428ad38d0ba6996146c8c"
      ;;
    "Linux aarch64"|"Linux arm64")
      name="git-minimal-musl-v2.55.0-linux-aarch64.tar.xz"
      url="https://github.com/baulk/git-minimal/releases/download/v2.55.0/${name}"
      sha="14375946388ffc83bdc5ac253aec0080880ee2fa22eb530cc9299e7ee482286f"
      ;;
    "Darwin arm64")
      name="dugite-native-v2.53.0-4098283-macOS-arm64.tar.gz"
      url="https://github.com/desktop/dugite-native/releases/download/v2.53.0-4/${name}"
      sha="f9dc64635a5b62fbd7ad95db73268bbb8912255ac516d65d37bf7af22fcb8ffe"
      ;;
    "Darwin x86_64")
      name="dugite-native-v2.53.0-4098283-macOS-x64.tar.gz"
      url="https://github.com/desktop/dugite-native/releases/download/v2.53.0-4/${name}"
      sha="ae6686718aa34f4140424db16b92a47dcffd6d1f312eb8b5f3b267f7404e2680"
      ;;
    *)
      echo "No portable git pin for $(uname -sm). Update cannot use system git." >&2
      exit 1
      ;;
  esac
  echo "Downloading portable git ($name) into $dest ..."
  local tmp
  tmp="$(mktemp)"
  if ! curl -fsSL "$url" -o "$tmp"; then
    rm -f "$tmp"
    echo "Failed to download portable git from $url" >&2
    exit 1
  fi
  verify_sha256 "$tmp" "$sha"
  extract_git_archive "$tmp" "$dest"
  rm -f "$tmp"
  if ! portable_git_bin "$dest" >/dev/null; then
    echo "Portable git downloaded but git --version failed in $dest." >&2
    exit 1
  fi
}

run_portable_git() {
  local home="$1" bin="$2"
  shift 2
  local bindir
  bindir="$(cd "$(dirname "$bin")" && pwd)"
  local env_args=(PATH="${bindir}:${PATH}")
  if [[ -d "$home/libexec/git-core" ]]; then
    env_args+=("GIT_EXEC_PATH=$home/libexec/git-core")
  fi
  if [[ -d "$home/share/git-core/templates" ]]; then
    env_args+=("GIT_TEMPLATE_DIR=$home/share/git-core/templates")
  fi
  if [[ -f "$home/ssl/cacert.pem" ]]; then
    env_args+=("GIT_SSL_CAINFO=$home/ssl/cacert.pem")
  fi
  env "${env_args[@]}" "$bin" "$@"
}

pick_and_download_zip() {
  local json zip_url zip_name work
  if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
    echo "python3 is required to pick the latest notebooks-v* release." >&2
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
  local asset_id zip_dl tag
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

STAGE="$(mktemp -d)"
cleanup_stage() {
  if [[ -n "${STAGE:-}" && -d "$STAGE" ]]; then
    rm -rf "$STAGE"
  fi
}
trap cleanup_stage EXIT

ensure_portable_git "$STAGE"
GIT_BIN="$(portable_git_bin "$STAGE")"
echo "Portable git: $GIT_BIN ($("$GIT_BIN" --version | head -n 1))"

if [[ "$ZIP_MODE" -eq 1 ]]; then
  echo "Zip mode: extracting the latest notebooks-v* GitHub Release (not a git clone)."
  pick_and_download_zip
else
  echo "Cloning export branch notebooks with portable git..."
  mkdir -p "$(dirname "$DEST")"
  if ! run_portable_git "$STAGE" "$GIT_BIN" clone --branch notebooks --single-branch --depth 1 \
    "$CLONE_URL" "$DEST"; then
    echo "Clone of branch notebooks failed." >&2
    auth_note
    echo "Airgapped / no branch yet: re-run with --zip, or download lisca-notebooks-X.Y.Z.zip from GitHub Releases." >&2
    exit 1
  fi
fi

mkdir -p "$DEST/.tools"
rm -rf "$DEST/.tools/git"
mv "$STAGE" "$DEST/.tools/git"
STAGE=""

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
