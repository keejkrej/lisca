#!/usr/bin/env bash
# Always clones export branch notebooks into PWD (default ./lisca-notebooks),
# then install. Optional arg is the folder name or path. Never user-global tool
# dirs. Portable git lives in DEST/.tools/git; .uv (and managed Python) live in DEST/.uv.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.sh | bash
#   curl ... | bash -s -- --no-install
#   curl ... | bash -s -- lisca-notebooks
# Env: GH_TOKEN / GITHUB_TOKEN (private repo).
set -euo pipefail

REPO="keejkrej/lisca"
CLONE_URL="https://github.com/${REPO}.git"
NO_INSTALL=0
DEST=""

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
case "$DEST" in
  /*) ;;
  *) DEST="$PWD/$DEST" ;;
esac
echo "Installing into $DEST (PWD only; portable git and .uv stay in this folder)."

token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [[ -n "$token" ]]; then
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

portable_git_bin() {
  local home="$1" c
  for c in \
    "$home/cmd/git" \
    "$home/cmd/git.exe" \
    "$home/bin/git" \
    "$home/bin/git.exe" \
    "$home/mingw64/bin/git.exe"
  do
    if [[ -f "$c" ]] && "$c" --version >/dev/null 2>&1; then
      printf '%s\n' "$c"
      return 0
    fi
  done
  return 1
}

extract_git_archive() {
  local archive="$1" dest="$2" work
  work="${dest}/_extract"
  rm -rf "$work"
  mkdir -p "$work"
  case "$archive" in
    *.zip) unzip -q "$archive" -d "$work" ;;
    *.tar.gz|*.tgz) tar -xzf "$archive" -C "$work" ;;
    *.tar.xz)
      if ! tar -xJf "$archive" -C "$work" 2>/dev/null; then
        if command -v python3 >/dev/null 2>&1; then
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
  local dest="$1" url sha name
  if portable_git_bin "$dest" >/dev/null; then
    echo "Using portable git at $(portable_git_bin "$dest")"
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
      echo "No portable git pin for $(uname -sm). Install git and re-run." >&2
      exit 1
      ;;
  esac
  echo "Downloading portable git ($name) into $dest ..."
  local tmp="$dest/$name"
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

run_git() {
  local bin="$GIT_BIN" home="${GIT_HOME:-}"
  if [[ -z "$home" ]]; then
    "$bin" "$@"
    return
  fi
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

STAGE=""
cleanup_stage() {
  if [[ -n "${STAGE:-}" && -d "$STAGE" ]]; then
    rm -rf "$STAGE"
  fi
}
trap cleanup_stage EXIT

GIT_HOME=""
if command -v git >/dev/null 2>&1 && git --version >/dev/null 2>&1; then
  GIT_BIN="$(command -v git)"
  echo "Using system git: $GIT_BIN"
else
  STAGE="${DEST}.portable-git"
  rm -rf "$STAGE"
  echo "System git not found; installing portable git into this folder..."
  ensure_portable_git "$STAGE"
  GIT_BIN="$(portable_git_bin "$STAGE")"
  GIT_HOME="$STAGE"
  echo "Portable git: $GIT_BIN"
fi

echo "Cloning export branch notebooks..."
mkdir -p "$(dirname "$DEST")"
if ! run_git clone --branch notebooks --single-branch --depth 1 "$CLONE_URL" "$DEST"; then
  echo "Clone of branch notebooks failed." >&2
  auth_note
  exit 1
fi

if [[ -n "$STAGE" ]]; then
  mkdir -p "$DEST/.tools"
  rm -rf "$DEST/.tools/git"
  mv "$STAGE" "$DEST/.tools/git"
  STAGE=""
fi

if [[ ! -f "$DEST/install.sh" || ! -f "$DEST/pyproject.toml" ]]; then
  echo "Cloned tree is missing install.sh or pyproject.toml: $DEST" >&2
  exit 1
fi

if [[ "$NO_INSTALL" -eq 0 ]]; then
  chmod +x "$DEST/install.sh" "$DEST/update.sh" "$DEST/scripts/"*.sh 2>/dev/null || true
  bash "$DEST/install.sh"
else
  echo "Skipped install (--no-install). Next: cd $DEST && bash install.sh"
fi
