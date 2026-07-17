import type { ContrastWindow } from "@lisca/contracts";

export function frameLoadRequest(contrast: ContrastWindow | null): ContrastWindow | null {
  return contrast;
}

export function shouldRunContrastFrameLoad(contrast: ContrastWindow | null): boolean {
  return contrast != null;
}
