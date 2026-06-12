import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSliderStepperField } from "../src/slider-stepper-field";

describe("useSliderStepperField", () => {
  it("formats axis labels for draft values", () => {
    const { result } = renderHook(() =>
      useSliderStepperField({
        value: 1,
        axisValues: [0, 12, 24],
      }),
    );

    expect(result.current.draftValue).toBe(1);
    expect(result.current.displayLabel).toBe("12 (2/3)");
    expect(result.current.ariaValueText).toBe("12, frame 2 of 3");
  });

  it("syncs draft value when prop changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useSliderStepperField({ value, axisValues: [0, 12, 24] }),
      { initialProps: { value: 0 } },
    );

    rerender({ value: 2 });
    expect(result.current.draftValue).toBe(2);
  });

  it("strips zero padding from option labels", () => {
    const { result } = renderHook(() =>
      useSliderStepperField({
        value: 1,
        valueLabel: "000000012 (2/3)",
      }),
    );

    expect(result.current.displayLabel).toBe("12 (2/3)");
  });
});
