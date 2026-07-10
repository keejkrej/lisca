import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type { JSX } from "solid-js";
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
  children: (state: ContrastControlState) => JSX.Element;
};

/** Per-frame auto contrast: sliders follow server auto values until manually adjusted. */
export function ContrastControl(props: ContrastControlProps) {
  const { domain, suggestedContrast, value } = deriveContrastControlState(
    props.frame,
    props.contrast,
  );
  const disabled = props.disabled ?? !props.frame;

  const state: ContrastControlState = {
    domainMin: domain.min,
    domainMax: domain.max,
    minValue: value.min,
    maxValue: value.max,
    disabled,
    autoRangeDisabled: disabled,
    onAutoRange: () => props.onContrastChange(suggestedContrast),
    onMinCommit: (min: number) => props.onContrastChange({ min, max: value.max }),
    onMaxCommit: (max: number) => props.onContrastChange({ min: value.min, max }),
  };

  return props.children(state);
}