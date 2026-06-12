import type { FrameResult } from "@lisca/utils";

const IMAGENET_MEAN = [0.485, 0.456, 0.406] as const;
const IMAGENET_STD = [0.229, 0.224, 0.225] as const;

export function normalizeCellPixels(values: Float32Array | Uint16Array | Uint8Array): Uint8ClampedArray {
  if (values.length === 0) return new Uint8ClampedArray(0);

  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]!;
    if (value < minimum) minimum = value;
    if (value > maximum) maximum = value;
  }

  const range = maximum - minimum;
  const rgba = new Uint8ClampedArray(values.length * 4);
  for (let index = 0; index < values.length; index += 1) {
    const normalized =
      range > 0 ? Math.round(((values[index]! - minimum) / range) * 255) : 0;
    const offset = index * 4;
    rgba[offset] = normalized;
    rgba[offset + 1] = normalized;
    rgba[offset + 2] = normalized;
    rgba[offset + 3] = 255;
  }
  return rgba;
}

export function cropCellToCanvas(
  frame: FrameResult,
  x: number,
  y: number,
  w: number,
  h: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx || w <= 0 || h <= 0) return canvas;

  const right = Math.min(x + w, frame.width);
  const bottom = Math.min(y + h, frame.height);
  const left = Math.max(x, 0);
  const top = Math.max(y, 0);
  const cropWidth = right - left;
  const cropHeight = bottom - top;
  if (cropWidth <= 0 || cropHeight <= 0) return canvas;

  const pixels = frame.pixels;
  const rgba = new Uint8ClampedArray(cropWidth * cropHeight * 4);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  const raw = new Float32Array(cropWidth * cropHeight);

  for (let row = 0; row < cropHeight; row += 1) {
    for (let col = 0; col < cropWidth; col += 1) {
      const frameOffset = (top + row) * frame.width + (left + col);
      const value = Number(pixels[frameOffset] ?? 0);
      raw[row * cropWidth + col] = value;
      if (value < minimum) minimum = value;
      if (value > maximum) maximum = value;
    }
  }

  const range = maximum - minimum;
  for (let index = 0; index < raw.length; index += 1) {
    const normalized =
      range > 0 ? Math.round(((raw[index]! - minimum) / range) * 255) : 0;
    const offset = index * 4;
    rgba[offset] = normalized;
    rgba[offset + 1] = normalized;
    rgba[offset + 2] = normalized;
    rgba[offset + 3] = 255;
  }

  ctx.putImageData(new ImageData(rgba, cropWidth, cropHeight), 0, 0);
  return canvas;
}

export function resizeCanvasToSquare(canvas: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const output = document.createElement("canvas");
  output.width = size;
  output.height = size;
  const ctx = output.getContext("2d");
  if (!ctx) return output;
  ctx.drawImage(canvas, 0, 0, size, size);
  return output;
}

export const smartExcludeImageNetMean = IMAGENET_MEAN;
export const smartExcludeImageNetStd = IMAGENET_STD;
