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

# Windows draws ICO pixels as-is. macOS masks icns in write_icns. Use the same
# 22.37% corner so a Windows shortcut matches the Dock icon.
mask_rounded_icon() {
  local src="$1"
  local dest="$2"
  local size="$3"
  local radius inset
  radius="$(awk -v size="$size" 'BEGIN { printf "%.0f", size * 0.2237 }')"
  inset="$((size - 1))"
  magick "$src" -alpha set \
    \( -size "${size}x${size}" xc:none -fill white -draw "roundrectangle 0,0 ${inset},${inset} ${radius},${radius}" \) \
    -compose DstIn -composite -type TrueColorAlpha -define png:color-type=6 PNG32:"$dest"
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

# macOS 26 and later leave an opaque square icns sharp in the Dock.
# Clip the plate to the app-icon corner so those corners stay transparent.
mask_macos_icon() {
  local src="$1"
  local dest="$2"
  if ! command -v swift >/dev/null 2>&1; then
    echo "missing required tool: swift" >&2
    exit 1
  fi
  swift - "$src" "$dest" <<'SWIFT'
import AppKit
let srcPath = CommandLine.arguments[1]
let destPath = CommandLine.arguments[2]
guard let image = NSImage(contentsOfFile: srcPath) else {
  fputs("unreadable icon \(srcPath)\n", stderr)
  exit(1)
}
let size = 1024
guard let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: size,
  pixelsHigh: size,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
) else {
  fputs("could not allocate icon bitmap\n", stderr)
  exit(1)
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let rect = NSRect(x: 0, y: 0, width: CGFloat(size), height: CGFloat(size))
let radius = CGFloat(size) * 0.2237
NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).addClip()
image.draw(in: rect)
NSGraphicsContext.restoreGraphicsState()
guard let png = rep.representation(using: .png, properties: [:]) else {
  fputs("could not encode icon\n", stderr)
  exit(1)
}
do {
  try png.write(to: URL(fileURLWithPath: destPath))
} catch {
  fputs("could not write \(destPath): \(error)\n", stderr)
  exit(1)
}
SWIFT
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
  local masked="$work/masked.png"
  local set="$work/icon.iconset"
  mkdir -p "$set"
  mask_macos_icon "$src" "$masked"
  magick "$masked" -resize 16x16 "$set/icon_16x16.png"
  magick "$masked" -resize 32x32 "$set/icon_16x16@2x.png"
  magick "$masked" -resize 32x32 "$set/icon_32x32.png"
  magick "$masked" -resize 64x64 "$set/icon_32x32@2x.png"
  magick "$masked" -resize 128x128 "$set/icon_128x128.png"
  magick "$masked" -resize 256x256 "$set/icon_128x128@2x.png"
  magick "$masked" -resize 256x256 "$set/icon_256x256.png"
  magick "$masked" -resize 512x512 "$set/icon_256x256@2x.png"
  magick "$masked" -resize 512x512 "$set/icon_512x512.png"
  magick "$masked" -resize 1024x1024 "$set/icon_512x512@2x.png"
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
  round_dir="$(mktemp -d)"
  rounded="$round_dir/rounded.png"
  mask_rounded_icon "$app/icon-1024.png" "$rounded" 1024
  write_png "$rounded" "$app/icon.png" 512
  # Browser favicons stay square; the desktop shortcut uses the rounded plate.
  write_png "$app/icon-1024.png" "$app/favicon.png" 48
  write_ico "$rounded" "$app/icon.ico" 256 128 64 48 32 16
  write_ico "$app/favicon.png" "$app/favicon.ico" 48 32 16

  icons="$root/apps/$product/desktop/src-tauri/icons"
  mkdir -p "$icons"
  write_tauri_pngs "$rounded" "$icons"
  write_ico "$rounded" "$icons/icon.ico" 256 128 64 48 32 16
  # icns applies the Swift mask itself, so it starts from the square master.
  write_icns "$app/icon-1024.png" "$icons/icon.icns"
  rm -rf "$round_dir"

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
