import {
  displayAxisLabels,
  formatAxisAriaValueText,
  formatAxisValueLabel,
  formatNavigationOptionDisplayLabel,
} from "@lisca/utils";

export type SliderStepperFieldFormatOptions = {
  axisValues?: readonly number[] | undefined;
  axisLabels?: readonly string[] | undefined;
  valueLabel?: string | undefined;
};

export type SliderStepperFieldOptions = SliderStepperFieldFormatOptions & {
  value: number;
};

export type UseSliderStepperFieldOptions = SliderStepperFieldOptions;

export type SliderStepperFieldListener = (draftValue: number) => void;

export type SliderStepperFieldController = {
  getDraftValue: () => number;
  setDraftValue: (nextValue: number) => void;
  syncValue: (nextValue?: number) => void;
  commitDraftValue: (nextValue: number, commit?: (value: number) => void) => void;
  displayLabel: () => string | undefined;
  ariaValueText: () => string | undefined;
  subscribe: (listener: SliderStepperFieldListener) => () => void;
};

export function sliderStepperDisplayLabel(
  options: SliderStepperFieldFormatOptions,
  draftValue: number,
): string | undefined {
  const { axisValues, axisLabels, valueLabel } = options;
  return axisValues
    ? formatAxisValueLabel(axisValues, draftValue, displayAxisLabels(axisLabels))
    : valueLabel
      ? formatNavigationOptionDisplayLabel(valueLabel)
      : undefined;
}

export function sliderStepperAriaValueText(
  options: SliderStepperFieldFormatOptions,
  draftValue: number,
): string | undefined {
  const { axisValues, axisLabels } = options;
  const label = sliderStepperDisplayLabel(options, draftValue);
  return axisValues
    ? formatAxisAriaValueText(axisValues, draftValue, displayAxisLabels(axisLabels))
    : label;
}

export function createSliderStepperField(
  options: SliderStepperFieldOptions | (() => SliderStepperFieldOptions),
): SliderStepperFieldController {
  const readOptions = (): SliderStepperFieldOptions =>
    typeof options === "function" ? options() : options;

  let syncedValue = readOptions().value;
  let draftValue = syncedValue;
  const listeners = new Set<SliderStepperFieldListener>();

  const emit = () => {
    for (const listener of listeners) {
      listener(draftValue);
    }
  };

  const setDraftValue = (nextValue: number) => {
    if (draftValue === nextValue) return;
    draftValue = nextValue;
    emit();
  };

  const syncValue = (nextValue?: number) => {
    const resolved = nextValue !== undefined ? nextValue : readOptions().value;
    syncedValue = resolved;
    setDraftValue(resolved);
  };

  const displayLabel = () => sliderStepperDisplayLabel(readOptions(), draftValue);

  const ariaValueText = () => sliderStepperAriaValueText(readOptions(), draftValue);

  const commitDraftValue = (nextValue: number, commit?: (value: number) => void) => {
    setDraftValue(nextValue);
    commit?.(nextValue);
    queueMicrotask(() => {
      const committedValue = typeof options === "function" ? options().value : syncedValue;
      syncedValue = committedValue;
      setDraftValue(committedValue);
    });
  };

  return {
    getDraftValue: () => draftValue,
    setDraftValue,
    syncValue,
    commitDraftValue,
    displayLabel,
    ariaValueText,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
