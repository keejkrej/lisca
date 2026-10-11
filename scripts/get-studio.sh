#!/usr/bin/env bash
# Install the latest LiSCA desktop release for this machine.
# Linux writes an AppImage to ~/.local/bin so the in-app updater can replace it.
# macOS copies the app into ~/Applications.
#
#   curl -fsSL https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-studio.sh | bash
#   curl -fsSL ... | bash -s -- aligner
#   curl -fsSL ... | bash -s -- annotator
#
# Tests set LISCA_RELEASES_JSON, LISCA_OS, and LISCA_ARCH and pass --print-url.
set -euo pipefail

REPO="keejkrej/lisca"

usage() {
  echo "Usage: get-studio.sh [--print-url] [studio|aligner|annotator]" >&2
}

product=""
print_url=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --print-url)
      print_url=1
      shift
      ;;
    studio | aligner | annotator)
      if [[ -n "$product" ]]; then
        echo "Unexpected extra argument: $1" >&2
        usage
        exit 1
      fi
      product="$1"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done
product="${product:-studio}"

case "$product" in
  studio)
    command_name="lisca-studio"
    title="Lisca Studio"
    wm_class="studio-tauri"
    ;;
  aligner)
    command_name="lisca-aligner"
    title="Lisca Aligner"
    wm_class="aligner-tauri"
    ;;
  annotator)
    command_name="lisca-annotator"
    title="Lisca Annotator"
    wm_class="annotator-tauri"
    ;;
esac

detect_platform() {
  local kernel arch
  kernel="$(uname -s)"
  arch="$(uname -m)"
  case "$kernel" in
    Linux) os_name="linux" ;;
    Darwin) os_name="darwin" ;;
    *)
      echo "This script installs macOS and Linux. On Windows run:" >&2
      echo "  irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-studio.ps1 | iex" >&2
      exit 1
      ;;
  esac
  case "$arch" in
    x86_64 | amd64) arch_name="x86_64" ;;
    aarch64 | arm64) arch_name="aarch64" ;;
    *)
      echo "Unsupported architecture: $arch" >&2
      exit 1
      ;;
  esac
}

own_releases=0
work=""
mnt=""
cleanup() {
  if [[ "$own_releases" -eq 1 ]]; then
    rm -f "$releases_json"
  fi
  if [[ -n "$mnt" && -d "$mnt" ]]; then
    hdiutil detach "$mnt" >/dev/null 2>&1 || true
  fi
  if [[ -n "$work" ]]; then
    rm -rf "$work"
  fi
}
trap cleanup EXIT

if [[ "$print_url" -eq 1 ]]; then
  os_name="${LISCA_OS:?Set LISCA_OS for --print-url}"
  arch_name="${LISCA_ARCH:?Set LISCA_ARCH for --print-url}"
  releases_json="${LISCA_RELEASES_JSON:?Set LISCA_RELEASES_JSON for --print-url}"
else
  detect_platform
  releases_json="$(mktemp)"
  own_releases=1
  curl_args=(-fsSL -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")
  token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
  if [[ -n "$token" ]]; then
    curl_args+=(-H "Authorization: Bearer ${token}")
  fi
  curl "${curl_args[@]}" "https://api.github.com/repos/${REPO}/releases?per_page=100" -o "$releases_json"
fi

picked="$(
  python3 - "$product" "$os_name" "$arch_name" "$releases_json" <<'PY'
import json
import sys

product, os_name, arch, path = sys.argv[1:5]
with open(path, encoding="utf-8") as handle:
    releases = json.load(handle)
if isinstance(releases, dict):
    message = releases.get("message") or "GitHub did not return a release list."
    raise SystemExit(message)
prefix = f"{product}-v"

def matches_arch(name: str) -> bool:
    lowered = name.lower()
    if arch == "x86_64":
        if "aarch64" in lowered or "arm64" in lowered:
            return False
        return "amd64" in lowered or "x86_64" in lowered or "x64" in lowered
    if arch == "aarch64":
        return "aarch64" in lowered or "arm64" in lowered
    return False

def matches_os(name: str) -> bool:
    lowered = name.lower()
    if lowered.endswith(".sig") or lowered.endswith(".zsync"):
        return False
    if os_name == "linux":
        return lowered.endswith(".appimage")
    if os_name == "darwin":
        return lowered.endswith(".dmg")
    if os_name == "windows":
        return lowered.endswith(".exe")
    return False

chosen = None
for release in releases:
    tag = str(release.get("tag_name") or "")
    if release.get("draft") or release.get("prerelease") or not tag.startswith(prefix):
        continue
    hits = []
    for asset in release.get("assets") or []:
        name = str(asset.get("name") or "")
        url = str(asset.get("browser_download_url") or "")
        if name and url and matches_os(name) and matches_arch(name):
            hits.append((url, name))
    if len(hits) > 1:
        raise SystemExit(f"{tag} has more than one {os_name} {arch} installer.")
    if len(hits) == 1:
        chosen = hits[0]
        break
    raise SystemExit(f"{tag} has no {os_name} {arch} installer.")

if chosen is None:
    raise SystemExit(f"No {prefix}* release has a {os_name} {arch} installer.")
print(chosen[0])
print(chosen[1])
PY
)"
url="$(printf '%s\n' "$picked" | sed -n '1p')"
asset="$(printf '%s\n' "$picked" | sed -n '2p')"
if [[ -z "$url" || -z "$asset" ]]; then
  echo "Could not choose an installer for ${product}." >&2
  exit 1
fi
if [[ "$print_url" -eq 1 ]]; then
  printf '%s\n' "$url"
  exit 0
fi

download() {
  local destination="$1"
  curl -fL --retry 3 -o "$destination" "$url"
}

case "$os_name" in
  linux)
    bindir="${HOME}/.local/bin"
    mkdir -p "$bindir"
    dest="${bindir}/${command_name}"
    if [[ -L "$dest" ]]; then
      link_target="$(readlink "$dest")"
      rm -f "$dest"
      case "$link_target" in
        "$wm_class" | "${bindir}/${wm_class}")
          rm -f "${bindir}/${wm_class}"
          rm -rf "${HOME}/.local/lib/${title}"
          ;;
      esac
    fi
    partial="$(mktemp "${dest}.XXXXXX")"
    download "$partial"
    chmod +x "$partial"
    mv -f "$partial" "$dest"
    icondir="${HOME}/.local/share/icons/hicolor/256x256/apps"
    mkdir -p "$icondir" "${HOME}/.local/share/applications"
    icon="${icondir}/${command_name}.png"
    curl -fsSL -o "$icon" "https://raw.githubusercontent.com/${REPO}/main/assets/brand/apps/${product}/icon.png" || rm -f "$icon"
    desktop="${HOME}/.local/share/applications/${title}.desktop"
    {
      echo "[Desktop Entry]"
      echo "Type=Application"
      echo "Name=${title}"
      echo "Exec=\"${dest}\""
      echo "StartupWMClass=${wm_class}"
      echo "Terminal=false"
      echo "Categories=Science;"
      if [[ -f "$icon" ]]; then
        echo "Icon=${icon}"
      fi
    } >"$desktop"
    if command -v update-desktop-database >/dev/null 2>&1; then
      update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true
    fi
    echo "Installed ${title}"
    echo "  ${dest}"
    case ":${PATH}:" in
      *":${bindir}:"*) echo "Launch it with ${command_name}" ;;
      *) echo "Add ${bindir} to PATH, then launch ${command_name}" ;;
    esac
    ;;
  darwin)
    work="$(mktemp -d)"
    dmg="${work}/${asset}"
    download "$dmg"
    mnt="${work}/mnt"
    mkdir -p "$mnt"
    hdiutil attach "$dmg" -readonly -nobrowse -mountpoint "$mnt" >/dev/null
    app="$(find "$mnt" -maxdepth 1 -name '*.app' -print -quit)"
    if [[ -z "$app" ]]; then
      hdiutil detach "$mnt" >/dev/null || true
      echo "No app in ${asset}" >&2
      exit 1
    fi
    mkdir -p "${HOME}/Applications"
    installed="${HOME}/Applications/$(basename "$app")"
    rm -rf "$installed"
    ditto "$app" "$installed"
    hdiutil detach "$mnt" >/dev/null
    mnt=""
    echo "Installed $(basename "$app")"
    echo "  ${installed}"
    ;;
esac
