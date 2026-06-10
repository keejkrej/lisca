import type { ContrastWindow } from "@lisca/contracts";

export type FrameLoadKind = "navigation" | "contrast";

export function frameLoadRequest(args: {
  kind: FrameLoadKind;
  contrast: ContrastWindow | null;
}): ContrastWindow | null {
  if (args.kind === "navigation") return null;
  return args.contrast;
}

export function shouldRunContrastFrameLoad(contrast: ContrastWindow | null): boolean {
  return contrast != null;
}

export function shouldResetContrastBeforeNavigationLoad(): boolean {
  return true;
}
