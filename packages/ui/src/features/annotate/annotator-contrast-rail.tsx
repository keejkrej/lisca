import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { PinnedContrastRail } from "../contrast/pinned-contrast-rail";

export function AnnotatorContrastRail(props: {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  disabled?: boolean;
  onContrastChange: (contrast: ContrastWindow | null) => void;
}) {
  return (
    <PinnedContrastRail
      contrast={props.contrast}
      disabled={props.disabled}
      frame={props.frame}
      onContrastChange={props.onContrastChange}
    />
  );
}
