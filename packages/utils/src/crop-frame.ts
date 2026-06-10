import type { PixelArray } from "./frame";

export type CropFrameBounds = {
  width: number;
  height: number;
  pixels: PixelArray;
};

export type CropFrameRegion = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function cropFrameRegion(frame: CropFrameBounds, region: CropFrameRegion): Uint16Array {
  const pixels = new Uint16Array(region.w * region.h);
  const frameWidth = frame.width;

  for (let row = 0; row < region.h; row += 1) {
    const srcRow = (region.y + row) * frameWidth + region.x;
    const dstRow = row * region.w;
    for (let col = 0; col < region.w; col += 1) {
      pixels[dstRow + col] = Number(frame.pixels[srcRow + col] ?? 0);
    }
  }

  return pixels;
}
