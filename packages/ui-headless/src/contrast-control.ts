import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { deriveContrastControlState } from "@lisca/utils";

export type ContrastControlState = {
  domainMin: number;
  domainMax: number;
  minValue: number;
  maxValue: number;
  disabled: boolean;
  autoRangeDisabled: boolean;
  onAutoRange: () => void;
  onMinCommit: (min: number) => void;
  onMaxCommit: (max: number) => void;
};

export type ContrastControlProps = {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  disabled?: boolean;
  onContrastChange: (contrast: ContrastWindow | null) => void;
  children: (state: ContrastControlState) => ReactNode;
};

/** Per-frame auto contrast: sliders follow server auto values until manually adjusted. */
export function ContrastControl(props: ContrastControlProps) {
  const { frame, contrast, disabled: disabledOverride, onContrastChange, children } = props;

  const { domain, suggestedContrast, value } = deriveContrastControlState(frame, contrast);
  const disabled = disabledOverride ?? !frame;

  const state = useMemo(
    () => ({
      domainMin: domain.min,
      domainMax: domain.max,
      minValue: value.min,
      maxValue: value.max,
      disabled,
      autoRangeDisabled: disabled,
      onAutoRange: () => onContrastChange(suggestedContrast),
      onMinCommit: (min: number) => onContrastChange({ min, max: value.max }),
      onMaxCommit: (max: number) => onContrastChange({ min: value.min, max }),
    }),
    [
      disabled,
      domain.max,
      domain.min,
      onContrastChange,
      suggestedContrast,
      value.max,
      value.min,
    ],
  );

  return children(state);
}
