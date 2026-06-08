import type { ContrastWindow, FrameResult } from "@lisca/contracts";

import { ContrastControl } from "./contrast-control";

export type PinnedContrastRailProps = {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  disabled?: boolean;
  onContrastChange: (contrast: ContrastWindow | null) => void;
  sectionClassName?: string;
  sectionContentClassName?: string;
};

export function PinnedContrastRail(props: PinnedContrastRailProps) {
  const domain = props.frame?.contrastDomain ?? { min: 0, max: 255 };
  const value = props.contrast ?? { min: domain.min, max: domain.max };
  const disabled = props.disabled ?? !props.frame;
  const suggestedContrast =
    props.frame?.suggestedContrast ??
    props.frame?.appliedContrast ?? { min: domain.min, max: domain.max };

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
      sectionClassName={props.sectionClassName}
      sectionContentClassName={props.sectionContentClassName}
      onAutoRange={() => props.onContrastChange(suggestedContrast)}
      onMaxCommit={(max) => props.onContrastChange({ min: value.min, max })}
      onMinCommit={(min) => props.onContrastChange({ min, max: value.max })}
    />
  );
}
