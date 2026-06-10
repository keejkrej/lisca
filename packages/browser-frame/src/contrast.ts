import type { ContrastWindow, FrameResult } from "@lisca/contracts";
import { clamp, defaultContrastDomain } from "@lisca/utils";

export function frameWithContrast(
  frame: FrameResult,
  contrast: ContrastWindow | null,
): FrameResult {
  if (!contrast) return frame;
  return { ...frame, appliedContrast: contrast };
}

export function toDisplayFrame(frame: FrameResult, contrast: ContrastWindow | null): FrameResult {
  const domain = frame.contrastDomain ?? defaultContrastDomain(frame);
  const applied = contrast ?? frame.appliedContrast ?? frame.suggestedContrast ?? domain;
  if (frame.pixelType === "uint8" || frame.pixelType === "uint8clamped") {
    return frameWithContrast(frame, applied);
  }

  const span = Math.max(1, applied.max - applied.min);
  const pixels = new Uint8Array(frame.width * frame.height);
  for (let index = 0; index < pixels.length; index += 1) {
    const raw = Number(frame.pixels[index] ?? 0);
    pixels[index] = clamp(Math.round(((raw - applied.min) / span) * 255), 0, 255);
  }
  return {
    width: frame.width,
    height: frame.height,
    pixels,
    pixelType: "uint8",
    contrastDomain: { min: 0, max: 255 },
    suggestedContrast: { min: 0, max: 255 },
    appliedContrast: { min: 0, max: 255 },
  };
}
