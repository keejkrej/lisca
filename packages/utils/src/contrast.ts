import type { ContrastWindow } from "@lisca/contracts";

import type { FrameResult } from "./frame";

const defaultContrastDomain: ContrastWindow = { min: 0, max: 255 };

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

export function deriveAutoContrast(frame: FrameResult | null): ContrastWindow {
  const domain = frame?.contrastDomain ?? defaultContrastDomain;
  return (
    frame?.appliedContrast ??
    frame?.suggestedContrast ?? { min: domain.min, max: domain.max }
  );
}

export function deriveContrastUiState(
  frame: FrameResult,
  contrast: ContrastWindow | null,
): DerivedContrastUiState {
  const domain = frame.contrastDomain ?? defaultContrastDomain;
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
  const domain = frame?.contrastDomain ?? defaultContrastDomain;
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
