import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { PinnedContrastRail } from "../contrast/pinned-contrast-rail";

export function AlignContrastRail(props: {
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
      sectionClassName="min-h-0 shrink-0"
      sectionContentClassName="flex min-h-0 flex-col overflow-auto"
      onContrastChange={props.onContrastChange}
    />
  );
}
