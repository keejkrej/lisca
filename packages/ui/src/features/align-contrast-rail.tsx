import type { ContrastWindow, FrameResult } from "@lisca/contracts";

import { ContrastControl } from "./contrast-control";

export function AlignContrastRail(props: {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  disabled?: boolean;
  onContrastChange: (contrast: ContrastWindow | null) => void;
}) {
  const domain = props.frame?.contrastDomain ?? { min: 0, max: 255 };
  const value =
    props.contrast ?? props.frame?.appliedContrast ?? { min: domain.min, max: domain.max };
  const disabled = props.disabled ?? !props.frame;

  return (
    <ContrastControl
      aria-label="Contrast"
      autoRangeDisabled={disabled}
      disabled={disabled}
      domainMax={domain.max}
      domainMin={domain.min}
      maxValue={value.max}
      minValue={value.min}
      role="region"
      sectionClassName="min-h-0 shrink-0"
      sectionContentClassName="flex min-h-0 flex-col overflow-auto"
      onAutoRange={() => props.onContrastChange(null)}
      onMaxCommit={(max) => props.onContrastChange({ min: value.min, max })}
      onMinCommit={(min) => props.onContrastChange({ min, max: value.max })}
    />
  );
}
