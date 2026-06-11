import type { FrameResult } from "@lisca/utils";
import { prepareFrameRgba } from "@lisca/utils";

export function frameToCanvas(frame: FrameResult): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const rgba = prepareFrameRgba(frame);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), frame.width, frame.height), 0, 0);
  return canvas;
}
