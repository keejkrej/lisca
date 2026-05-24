#!/usr/bin/env bash
# Round corners on Lisca brand PNG icons (~22% radius, macOS-like squircle).
# Leaves AppIcon.icns square — macOS applies its own mask.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
brand="$root/assets/brand"
radius_pct="${LISCA_ICON_RADIUS_PCT:-22}"

round_png() {
  local input="$1"
  local output="$2"
  local w h r

  w="$(magick identify -format "%w" "$input")"
  h="$(magick identify -format "%h" "$input")"
  r=$(( w * radius_pct / 100 ))
  if [ "$r" -lt 2 ]; then
    r=2
  fi

  magick "$input" \
    \( -size "${w}x${h}" xc:none -draw "fill white roundrectangle 0,0 $((w - 1)),$((h - 1)) ${r},${r}" \) \
    -compose DstIn -composite "$output"

  echo "rounded $(basename "$input") (${w}px, r=${r})"
}

for png in icon.png adaptive-icon.png splash-icon.png favicon.png; do
  round_png "$brand/$png" "$brand/$png"
done

magick "$brand/icon.png" -define icon:auto-resize=256,128,64,48,32,16 "$brand/icon.ico"
echo "regenerated icon.ico"

magick "$brand/favicon.png" -define icon:auto-resize=48,32,16 "$brand/favicon.ico"
echo "regenerated favicon.ico"

echo "Done. AppIcon.icns left unchanged for macOS."
