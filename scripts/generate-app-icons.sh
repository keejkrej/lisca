#!/usr/bin/env bash
# Rasterize assets/brand/apps/{aligner,annotator,studio}/icon.svg into web
# favicons and the Tauri icon sets that desktop packaging / GitHub Releases use.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
brand="$root/assets/brand"
products=(aligner annotator studio)

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required tool: $1" >&2
    exit 1
  fi
}

need magick

rasterize() {
  local svg="$1"
  local png="$2"
  local size="$3"
  # ImageMagick's built-in SVG renderer drops strokes on these doodles.
  # Prefer rsvg, then macOS Quick Look, then magick as a last resort.
  if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w "$size" -h "$size" "$svg" -o "$png"
    return
  fi
  if command -v qlmanage >/dev/null 2>&1; then
    local work
    work="$(mktemp -d)"
    qlmanage -t -s "$size" -o "$work" "$svg" >/dev/null
    local thumb
    thumb="$(find "$work" -name '*.png' | head -n 1)"
    if [ -z "$thumb" ]; then
      echo "qlmanage produced no thumbnail for $svg" >&2
      rm -rf "$work"
      exit 1
    fi
    magick "$thumb" -resize "${size}x${size}" -type TrueColorAlpha -define png:color-type=6 PNG32:"$png"
    rm -rf "$work"
    return
  fi
  magick -background none -density 384 "$svg" -resize "${size}x${size}" -alpha on "$png"
}

write_ico() {
  local png="$1"
  local ico="$2"
  shift 2
  magick "$png" -define "icon:auto-resize=$(
    IFS=,
    echo "$*"
  )" "$ico"
}

write_icns() {
  local src="$1"
  local dest="$2"
  if ! command -v iconutil >/dev/null 2>&1; then
    echo "skip icns (iconutil not available): $dest"
    return 0
  fi
  local work
  work="$(mktemp -d)"
  local set="$work/icon.iconset"
  mkdir -p "$set"
  magick "$src" -resize 16x16 "$set/icon_16x16.png"
  magick "$src" -resize 32x32 "$set/icon_16x16@2x.png"
  magick "$src" -resize 32x32 "$set/icon_32x32.png"
  magick "$src" -resize 64x64 "$set/icon_32x32@2x.png"
  magick "$src" -resize 128x128 "$set/icon_128x128.png"
  magick "$src" -resize 256x256 "$set/icon_128x128@2x.png"
  magick "$src" -resize 256x256 "$set/icon_256x256.png"
  magick "$src" -resize 512x512 "$set/icon_256x256@2x.png"
  magick "$src" -resize 512x512 "$set/icon_512x512.png"
  magick "$src" -resize 1024x1024 "$set/icon_512x512@2x.png"
  iconutil -c icns "$set" -o "$dest"
  rm -rf "$work"
}

write_png() {
  local src="$1"
  local dest="$2"
  local size="$3"
  # Tauri requires 8-bit RGBA; ImageMagick otherwise writes gray/palette PNGs.
  magick "$src" -resize "${size}x${size}" -type TrueColorAlpha -define png:color-type=6 PNG32:"$dest"
}

write_tauri_pngs() {
  local src="$1"
  local icons="$2"
  write_png "$src" "$icons/32x32.png" 32
  write_png "$src" "$icons/64x64.png" 64
  write_png "$src" "$icons/128x128.png" 128
  write_png "$src" "$icons/128x128@2x.png" 256
  write_png "$src" "$icons/icon.png" 512
}

for product in "${products[@]}"; do
  app="$brand/apps/$product"
  svg="$app/icon.svg"
  if [ ! -f "$svg" ]; then
    echo "missing $svg" >&2
    exit 1
  fi

  rasterize "$svg" "$app/icon-1024.png" 1024
  write_png "$app/icon-1024.png" "$app/icon.png" 512
  write_png "$app/icon-1024.png" "$app/favicon.png" 48
  write_ico "$app/icon-1024.png" "$app/icon.ico" 256 128 64 48 32 16
  write_ico "$app/favicon.png" "$app/favicon.ico" 48 32 16

  icons="$root/apps/$product/desktop/src-tauri/icons"
  mkdir -p "$icons"
  write_tauri_pngs "$app/icon-1024.png" "$icons"
  write_ico "$app/icon-1024.png" "$icons/icon.ico" 256 128 64 48 32 16
  write_icns "$app/icon-1024.png" "$icons/icon.icns"

  echo "generated $product icons"
done

# Landing and shared Vite publicDir fall back to Studio.
cp "$brand/apps/studio/icon.png" "$brand/icon.png"
cp "$brand/apps/studio/icon.png" "$brand/adaptive-icon.png"
cp "$brand/apps/studio/icon.png" "$brand/splash-icon.png"
cp "$brand/apps/studio/favicon.png" "$brand/favicon.png"
cp "$brand/apps/studio/icon.ico" "$brand/icon.ico"
cp "$brand/apps/studio/favicon.ico" "$brand/favicon.ico"
if [ -f "$root/apps/studio/desktop/src-tauri/icons/icon.icns" ]; then
  cp "$root/apps/studio/desktop/src-tauri/icons/icon.icns" "$brand/AppIcon.icns"
fi

echo "Done. Desktop packaging reads apps/<product>/desktop/src-tauri/icons."
