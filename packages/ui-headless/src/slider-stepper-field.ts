import {
  displayAxisLabels,
  formatAxisAriaValueText,
  formatAxisValueLabel,
  formatNavigationOptionDisplayLabel,
} from "@lisca/utils";
import { createEffect, createSignal, type Accessor } from "solid-js";

export type UseSliderStepperFieldOptions = {
  value: number;
  axisValues?: readonly number[];
  axisLabels?: readonly string[];
  valueLabel?: string;
};

export function useSliderStepperField(options: () => UseSliderStepperFieldOptions) {
  const [draftValue, setDraftValue] = createSignal(options().value);

  createEffect(() => {
    setDraftValue(options().value);
  });

  const displayLabel = () => {
    const { axisValues, axisLabels, valueLabel } = options();
    const draft = draftValue();
    return axisValues
      ? formatAxisValueLabel(axisValues, draft, displayAxisLabels(axisLabels))
      : valueLabel
        ? formatNavigationOptionDisplayLabel(valueLabel)
        : undefined;
  };
  const ariaValueText = () => {
    const { axisValues, axisLabels } = options();
    const draft = draftValue();
    const label = displayLabel();
    return axisValues
      ? formatAxisAriaValueText(axisValues, draft, displayAxisLabels(axisLabels))
      : label;
  };

  return {
    draftValue: draftValue as Accessor<number>,
    setDraftValue,
    displayLabel,
    ariaValueText,
  };
}