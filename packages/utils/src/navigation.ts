import { clamp } from "./frame";

export type AxisIndexSliderControl = {
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel?: string;
  axisValues?: readonly number[];
  axisLabels?: readonly string[];
  disabled?: boolean;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onCommit?: (value: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function formatAxisValueLabel(
  axisValues: readonly number[] | undefined,
  index: number,
  axisLabels?: readonly string[] | undefined,
): string | undefined {
  if (!axisValues || axisValues.length === 0) return undefined;

  const max = axisValues.length - 1;
  const clamped = clamp(index, 0, max);
  const frame = clamped + 1;
  const total = axisValues.length;
  const displayValue = axisLabels?.[clamped] ?? String(axisValues[clamped]);

  return `${displayValue} (${frame}/${total})`;
}

export function formatAxisAriaValueText(
  axisValues: readonly number[] | undefined,
  index: number,
  axisLabels?: readonly string[] | undefined,
): string | undefined {
  if (!axisValues || axisValues.length === 0) return undefined;

  const max = axisValues.length - 1;
  const clamped = clamp(index, 0, max);
  const frame = clamped + 1;
  const total = axisValues.length;
  const displayValue = axisLabels?.[clamped] ?? String(axisValues[clamped]);

  return `${displayValue}, frame ${frame} of ${total}`;
}

export function resolveAxisSelection(
  axisValues: readonly number[] | undefined,
  preferred: number,
): number {
  if (!axisValues || axisValues.length === 0) return preferred;
  if (axisValues.includes(preferred)) return preferred;
  if (preferred >= 0 && preferred < axisValues.length) {
    return axisValues[preferred] ?? axisValues[0];
  }
  return axisValues[0];
}

export function selectedAxisIndex(
  axisValues: readonly number[] | undefined,
  preferred: number,
): number {
  if (!axisValues || axisValues.length === 0) return 0;
  const direct = axisValues.indexOf(preferred);
  if (direct >= 0) return direct;
  if (preferred >= 0 && preferred < axisValues.length) return preferred;
  return 0;
}

export function toAxisNavigationOptions(
  axisValues: readonly number[],
  axisLabels?: readonly string[],
): { label: string; value: number }[] {
  return axisValues.map((value, index) => ({
    value,
    label: formatAxisValueLabel(axisValues, index, axisLabels) ?? String(value),
  }));
}

export function createAxisIndexSliderControl(args: {
  axisValues: readonly number[] | undefined;
  axisLabels?: readonly string[] | undefined;
  index: number;
  onIndexChange: (index: number) => void;
  disabled?: boolean;
}): AxisIndexSliderControl {
  const axisValues = args.axisValues ?? [];
  const max = Math.max(0, axisValues.length - 1);
  const index = clamp(args.index, 0, max);
  const baseDisabled = args.disabled ?? false;
  const sliderDisabled = baseDisabled || max <= 0;

  return {
    value: index,
    min: 0,
    max,
    step: 1,
    valueLabel: formatAxisValueLabel(axisValues, index, args.axisLabels),
    axisValues,
    axisLabels: args.axisLabels,
    disabled: sliderDisabled,
    previousDisabled: baseDisabled || index <= 0,
    nextDisabled: baseDisabled || index >= max,
    onCommit: (nextValue) => args.onIndexChange(clamp(Math.round(nextValue), 0, max)),
    onPrevious: () => args.onIndexChange(Math.max(0, index - 1)),
    onNext: () => args.onIndexChange(Math.min(max, index + 1)),
  };
}
