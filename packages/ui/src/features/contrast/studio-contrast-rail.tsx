import type { ContrastWindow, FrameResult } from "@lisca/contracts";

import { ContrastControl } from "./contrast-control";

/** Per-frame contrast: sliders follow auto values until adjusted; overrides do not carry across frames. */
export function StudioContrastRail(props: {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  disabled?: boolean;
  onContrastChange: (contrast: ContrastWindow | null) => void;
}) {
  const domain = props.frame?.contrastDomain ?? { min: 0, max: 255 };
  const autoContrast = props.frame?.appliedContrast ??
    props.frame?.suggestedContrast ?? { min: domain.min, max: domain.max };
  const value = props.contrast ?? autoContrast;
  const disabled = props.disabled ?? !props.frame;
  const suggestedContrast = props.frame?.suggestedContrast ?? autoContrast;

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
      onAutoRange={() => props.onContrastChange(suggestedContrast)}
      onMaxCommit={(max) => props.onContrastChange({ min: value.min, max })}
      onMinCommit={(min) => props.onContrastChange({ min, max: value.max })}
    />
  );
}
