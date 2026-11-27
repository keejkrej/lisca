import { describe, expect, it } from "vite-plus/test";

import {
  createSliderStepperField,
  sliderStepperAriaValueText,
  sliderStepperDisplayLabel,
} from "../src/slider-stepper-field";

describe("createSliderStepperField", () => {
  it("formats axis labels for draft values", () => {
    const field = createSliderStepperField({
      value: 1,
      axisValues: [0, 12, 24],
    });

    expect(field.getDraftValue()).toBe(1);
    expect(field.displayLabel()).toBe("12 (2/3)");
    expect(field.ariaValueText()).toBe("12, frame 2 of 3");
    expect(sliderStepperDisplayLabel({ axisValues: [0, 12, 24] }, 1)).toBe("12 (2/3)");
    expect(sliderStepperAriaValueText({ axisValues: [0, 12, 24] }, 1)).toBe("12, frame 2 of 3");
  });

  it("syncs draft value when prop changes", () => {
    let value = 0;
    const field = createSliderStepperField(() => ({
      value,
      axisValues: [0, 12, 24],
    }));

    expect(field.getDraftValue()).toBe(0);
    value = 2;
    field.syncValue();
    expect(field.getDraftValue()).toBe(2);

    field.syncValue(1);
    expect(field.getDraftValue()).toBe(1);
  });

  it("strips zero padding from option labels", () => {
    const field = createSliderStepperField({
      value: 1,
      valueLabel: "000000012 (2/3)",
    });

    expect(field.displayLabel()).toBe("12 (2/3)");
    expect(sliderStepperDisplayLabel({ valueLabel: "000000012 (2/3)" }, 1)).toBe("12 (2/3)");
  });

  it("snaps draftValue back to value when commit is cancelled or clamped", async () => {
    const field = createSliderStepperField({
      value: 0,
      axisValues: [0, 12, 24],
    });

    field.commitDraftValue(2, () => {
      // Simulate rejected dirty-guard prompt: value stays 0.
    });
    expect(field.getDraftValue()).toBe(2);
    await Promise.resolve();
    expect(field.getDraftValue()).toBe(0);
  });
});
