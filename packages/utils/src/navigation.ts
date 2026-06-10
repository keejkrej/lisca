import { clamp } from "./frame";

export type NavigationValue = number | string;

export type NavigationOption<T extends NavigationValue = number> = {
  label: string;
  value: T;
};

export function toNavigationOptions(values: readonly number[]): NavigationOption<number>[] {
  return values.map((value) => ({ value, label: String(value) }));
}

export function findNavigationOptionIndex<T extends NavigationValue>(
  options: NavigationOption<T>[],
  value: T | null | undefined,
): number {
  if (options.length === 0) return -1;
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
}

export function stepNavigationValue<T extends NavigationValue>(
  options: NavigationOption<T>[],
  value: T | null | undefined,
  direction: -1 | 1,
): T | null {
  const index = findNavigationOptionIndex(options, value);
  if (index < 0) return null;
  const nextIndex = Math.min(options.length - 1, Math.max(0, index + direction));
  return options[nextIndex]?.value ?? null;
}

/** Strip leading zeros from numeric axis labels for display only. */
export function stripZeroPaddingFromNumericDisplay(value: string): string {
  if (/^\d+$/.test(value)) {
    return String(Number.parseInt(value, 10));
  }
  return value;
}

export function displayAxisLabels(
  labels: readonly string[] | undefined,
): readonly string[] | undefined {
  return labels?.map(stripZeroPaddingFromNumericDisplay);
}

/** Format select option labels such as `00012 (2/3)` for display. */
export function formatNavigationOptionDisplayLabel(label: string): string {
  const match = /^(.+?) \((\d+\/\d+)\)$/.exec(label);
  if (!match) return stripZeroPaddingFromNumericDisplay(label);
  const [, value, position] = match;
  return `${stripZeroPaddingFromNumericDisplay(value)} (${position})`;
}

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
