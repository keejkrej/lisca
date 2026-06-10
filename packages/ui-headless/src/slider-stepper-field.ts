import {
  displayAxisLabels,
  formatAxisAriaValueText,
  formatAxisValueLabel,
  formatNavigationOptionDisplayLabel,
} from "@lisca/utils";
import { useEffect, useState } from "react";

export type UseSliderStepperFieldOptions = {
  value: number;
  axisValues?: readonly number[];
  axisLabels?: readonly string[];
  valueLabel?: string;
};

export function useSliderStepperField(options: UseSliderStepperFieldOptions) {
  const { value, axisValues, axisLabels, valueLabel } = options;
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const displayLabel = axisValues
    ? formatAxisValueLabel(axisValues, draftValue, displayAxisLabels(axisLabels))
    : valueLabel
      ? formatNavigationOptionDisplayLabel(valueLabel)
      : undefined;
  const ariaValueText = axisValues
    ? formatAxisAriaValueText(axisValues, draftValue, displayAxisLabels(axisLabels))
    : displayLabel;

  return {
    draftValue,
    setDraftValue,
    displayLabel,
    ariaValueText,
  };
}
