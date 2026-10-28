import type { ContrastWindow } from "@lisca/contracts";

import { defaultContrastDomain, type FrameResult } from "./frame";

export type DerivedContrastUiState = {
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
};

export type DerivedContrastControlState = {
  domain: ContrastWindow;
  autoContrast: ContrastWindow;
  suggestedContrast: ContrastWindow;
  value: ContrastWindow;
};

function contrastDomainForFrame(frame: FrameResult | null): ContrastWindow {
  if (!frame) return defaultContrastDomain(undefined);
  return frame.contrastDomain ?? defaultContrastDomain(frame.pixelType);
}

export function deriveAutoContrast(frame: FrameResult | null): ContrastWindow {
  const domain = contrastDomainForFrame(frame);
  return frame?.appliedContrast ?? frame?.suggestedContrast ?? { min: domain.min, max: domain.max };
}

/**
 * Contrast window to request for a frame that is not the one on screen.
 *
 * Unlocked viewers follow each frame's raw intensity domain, so a manual window is
 * dropped on every frame change (`null` = ask the server for the domain). Locking pins
 * the window: the manual one when the user set it, else whatever the outgoing
 * frame was displayed with, which is the window they pressed Lock on.
 */
export function contrastForFrameChange(
  contrast: ContrastWindow | null,
  contrastLocked: boolean,
  currentFrame: FrameResult | null,
): ContrastWindow | null {
  if (!contrastLocked) return null;
  return contrast ?? deriveAutoContrast(currentFrame);
}

export function deriveContrastUiState(
  frame: FrameResult,
  contrast: ContrastWindow | null,
): DerivedContrastUiState {
  const domain = contrastDomainForFrame(frame);
  const autoContrast = deriveAutoContrast(frame);
  return {
    contrastDomain: domain,
    contrastMin: contrast?.min ?? autoContrast.min,
    contrastMax: contrast?.max ?? autoContrast.max,
  };
}

export function deriveContrastControlState(
  frame: FrameResult | null,
  contrast: ContrastWindow | null,
): DerivedContrastControlState {
  const domain = contrastDomainForFrame(frame);
  const autoContrast = deriveAutoContrast(frame);
  const suggestedContrast = frame?.suggestedContrast ?? autoContrast;
  const value = contrast ?? autoContrast;
  return {
    domain,
    autoContrast,
    suggestedContrast,
    value,
  };
}
