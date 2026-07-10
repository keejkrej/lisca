import type { FrameResult } from "@lisca/utils";
import { prepareFrameRgba } from "@lisca/utils";

function frameBitmapCacheKey(frame: FrameResult): string {
  const contrast = frame.appliedContrast ?? frame.suggestedContrast ?? frame.contrastDomain;
  const contrastKey = contrast ? `${contrast.min}:${contrast.max}` : "none";
  return `${frame.width}x${frame.height}:${frame.pixelType ?? "uint8"}:${contrastKey}:${frame.pixels.length}`;
}

function createPreparedFrameBitmap(frame: FrameResult): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const rgba = prepareFrameRgba(frame);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), frame.width, frame.height), 0, 0);
  return canvas;
}

type FrameBitmapCache = { key: string; bitmap: HTMLCanvasElement };

/** Reuses the decoded frame bitmap until frame pixels or contrast change. */
export function usePreparedFrameBitmap(frame: FrameResult | null): HTMLCanvasElement | null {
  let cache: FrameBitmapCache | undefined;

  if (!frame) {
    return null;
  }

  const key = frameBitmapCacheKey(frame);
  if (cache?.key === key) {
    return cache.bitmap;
  }

  const bitmap = createPreparedFrameBitmap(frame);
  cache = { key, bitmap };
  return bitmap;
}