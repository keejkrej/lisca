import type { FrameResult } from "./frame";
import { clamp } from "./frame";

export function pixelToDisplayValue(frame: FrameResult, index: number): number {
  const raw = Number(frame.pixels[index] ?? 0);
  const contrast = frame.appliedContrast ?? frame.suggestedContrast ?? frame.contrastDomain;
  if (!contrast || frame.pixelType === "uint8" || frame.pixelType === "uint8clamped") {
    return clamp(Math.round(raw), 0, 255);
  }
  const span = Math.max(1, contrast.max - contrast.min);
  return clamp(Math.round(((raw - contrast.min) / span) * 255), 0, 255);
}

export function prepareFrameRgba(frame: FrameResult): Uint8Array {
  const rgba = new Uint8Array(frame.width * frame.height * 4);
  for (let index = 0; index < frame.width * frame.height; index += 1) {
    const value = pixelToDisplayValue(frame, index);
    const offset = index * 4;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
    rgba[offset + 3] = 255;
  }
  return rgba;
}

export type FrameLayout = {
  scale: number;
  drawWidth: number;
  drawHeight: number;
  drawX: number;
  drawY: number;
};

export function computeFrameLayout(
  viewportWidth: number,
  viewportHeight: number,
  frameWidth: number,
  frameHeight: number,
): FrameLayout {
  const scale = Math.min(viewportWidth / frameWidth, viewportHeight / frameHeight);
  const drawWidth = frameWidth * scale;
  const drawHeight = frameHeight * scale;
  return {
    scale,
    drawWidth,
    drawHeight,
    drawX: (viewportWidth - drawWidth) / 2,
    drawY: (viewportHeight - drawHeight) / 2,
  };
}

export function clientToFramePoint(
  clientX: number,
  clientY: number,
  layout: FrameLayout,
  boundsX: number,
  boundsY: number,
): { x: number; y: number } | null {
  const pointerX = clientX - boundsX;
  const pointerY = clientY - boundsY;
  if (
    pointerX < layout.drawX ||
    pointerX > layout.drawX + layout.drawWidth ||
    pointerY < layout.drawY ||
    pointerY > layout.drawY + layout.drawHeight
  ) {
    return null;
  }
  return {
    x: (pointerX - layout.drawX) / layout.scale,
    y: (pointerY - layout.drawY) / layout.scale,
  };
}
