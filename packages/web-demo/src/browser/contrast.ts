import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { clamp, defaultContrastDomain, orderedContrastWindow } from "@lisca/utils";

export function frameWithContrast(
  frame: FrameResult,
  contrast: ContrastWindow | null,
): FrameResult {
  if (!contrast) return frame;
  const domain = frame.contrastDomain ?? defaultContrastDomain(frame.pixelType);
  return { ...frame, appliedContrast: orderedContrastWindow(contrast, domain) };
}

export function toDisplayFrame(frame: FrameResult, contrast: ContrastWindow | null): FrameResult {
  const domain = frame.contrastDomain ?? defaultContrastDomain(frame.pixelType);
  const applied = orderedContrastWindow(
    contrast ?? frame.appliedContrast ?? frame.suggestedContrast ?? domain,
    domain,
  );
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
