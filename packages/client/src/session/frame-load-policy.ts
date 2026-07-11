import type { ContrastWindow } from "@lisca/contracts";

export type FrameLoadKind = "navigation" | "contrast";

export function frameLoadRequest(args: {
  kind: FrameLoadKind;
  contrast: ContrastWindow | null;
}): ContrastWindow | null {
  return args.contrast;
}

export function shouldRunContrastFrameLoad(contrast: ContrastWindow | null): boolean {
  return contrast != null;
}
