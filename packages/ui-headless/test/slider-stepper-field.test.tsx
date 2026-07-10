import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { useSliderStepperField } from "../src/slider-stepper-field";

function mountSliderStepperField(options: () => Parameters<typeof useSliderStepperField>[0] extends () => infer T ? T : never) {
  let result!: ReturnType<typeof useSliderStepperField>;
  render(() => {
    result = useSliderStepperField(options);
    return null;
  });
  return () => result;
}

describe("useSliderStepperField", () => {
  it("formats axis labels for draft values", () => {
    const result = mountSliderStepperField(() => ({
      value: 1,
      axisValues: [0, 12, 24],
    }));

    expect(result().draftValue()).toBe(1);
    expect(result().displayLabel()).toBe("12 (2/3)");
    expect(result().ariaValueText()).toBe("12, frame 2 of 3");
  });

  it("syncs draft value when prop changes", () => {
    const [value, setValue] = createSignal(0);
    const result = mountSliderStepperField(() => ({
      value: value(),
      axisValues: [0, 12, 24],
    }));

    expect(result().draftValue()).toBe(0);
    setValue(2);
    expect(result().draftValue()).toBe(2);
  });

  it("strips zero padding from option labels", () => {
    const result = mountSliderStepperField(() => ({
      value: 1,
      valueLabel: "000000012 (2/3)",
    }));

    expect(result().displayLabel()).toBe("12 (2/3)");
  });
});