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
