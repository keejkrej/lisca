#!/usr/bin/env bash
# Update this notebooks tree from export branch notebooks, then uv sync like install.
# Uses system git if present, otherwise portable git under ROOT/.tools/git.
# If ROOT has no .git, bootstrap onto branch notebooks (keep .venv / .uv / .tools).
# Does not download a notebooks zip.
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

ORIGIN_URL="https://github.com/keejkrej/lisca.git"
CLONE_HINT="curl -fsSL https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.sh | bash"

# Portable Git pins. Keep in sync with scripts/get-notebooks.sh and *.ps1.
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
  work="$(mktemp -d)"
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

ensure_gitignore() {
  local gi="$ROOT/.gitignore"
  touch "$gi"
  local line
  for line in ".venv/" ".uv/" ".tools/"; do
    if ! grep -Fxq "$line" "$gi"; then
      printf '%s\n' "$line" >>"$gi"
    fi
  done
}

sync_env() {
  local UV_DIR="$ROOT/.uv"
  local UV_BIN="$UV_DIR/uv"
  local TAR URL current VENV_DIR VENV_PYTHON ARCH
  case "$(uname -sm)" in
      "Linux x86_64") ARCH="x86_64-unknown-linux-gnu" ;;
      "Darwin x86_64") ARCH="x86_64-apple-darwin" ;;
      "Darwin arm64") ARCH="aarch64-apple-darwin" ;;
      *)
          echo "Unsupported platform: $(uname -sm)" >&2
          exit 1
          ;;
  esac
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
}

GIT_HOME=""
if command -v git >/dev/null 2>&1 && git --version >/dev/null 2>&1; then
  GIT_BIN="$(command -v git)"
  echo "Using system git: $GIT_BIN"
else
  GIT_HOME="$ROOT/.tools/git"
  echo "System git not found; using portable git under .tools/git ..."
  ensure_portable_git "$GIT_HOME"
  GIT_BIN="$(portable_git_bin "$GIT_HOME")"
fi

if [[ ! -e "$ROOT/.git" ]]; then
  echo "No .git here. Bootstrapping onto export branch notebooks..."
  echo "Keeping .venv / .uv / .tools."
  ensure_gitignore
  run_git -C "$ROOT" init -q
  if ! run_git -C "$ROOT" remote get-url origin >/dev/null 2>&1; then
    run_git -C "$ROOT" remote add origin "$ORIGIN_URL"
  fi
  run_git -C "$ROOT" fetch --depth 1 origin notebooks
  run_git -C "$ROOT" checkout -f -B notebooks origin/notebooks
else
  branch="$(run_git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  upstream="$(run_git -C "$ROOT" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)"
  if [[ "$branch" != "notebooks" && "$upstream" != */notebooks ]]; then
    echo "This folder tracks '${branch:-detached}'${upstream:+ (upstream $upstream)}, not notebooks." >&2
    echo "update.sh only tracks the notebooks export branch, not main." >&2
    echo "Re-get:" >&2
    echo "  $CLONE_HINT" >&2
    exit 1
  fi
  if [[ -n "$(run_git -C "$ROOT" status --porcelain)" ]]; then
    echo "Working tree is dirty. Stash or re-clone, then retry." >&2
    run_git -C "$ROOT" status --short >&2
    exit 1
  fi
  echo "Pulling branch notebooks (ff-only)..."
  if ! run_git -C "$ROOT" pull --ff-only; then
    echo "git pull --ff-only failed (diverged from upstream). Stash/reset or re-clone:" >&2
    echo "  $CLONE_HINT" >&2
    exit 1
  fi
fi

sync_env

version="$(tr -d '[:space:]' < "$ROOT/VERSION")"
describe="$(run_git -C "$ROOT" describe --tags --always 2>/dev/null || true)"
echo "Done. Now at ${version}${describe:+ (${describe})}."
echo ""
echo "Config cells in notebooks/ may have changed; re-check them before running."
echo "On a laptop, start Jupyter with:"
echo "  bash scripts/jupyter-notebook.sh"
echo "On JupyterHub, register the Lisca kernel with:"
echo "  bash scripts/jupyter-hub.sh"
