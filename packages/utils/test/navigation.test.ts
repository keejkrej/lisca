import { describe, expect, it, vi } from "vitest";

import {
  createAxisIndexSliderControl,
  findNavigationOptionIndex,
  formatAxisAriaValueText,
  formatAxisValueLabel,
  formatNavigationOptionDisplayLabel,
  resolveAxisSelection,
  selectedAxisIndex,
  stepNavigationValue,
  stripZeroPaddingFromNumericDisplay,
  toAxisNavigationOptions,
  toNavigationOptions,
} from "../src/navigation";

describe("formatAxisValueLabel", () => {
  it("shows parsed value and position for sparse axes", () => {
    expect(formatAxisValueLabel([0, 12, 24], 1)).toBe("12 (2/3)");
  });

  it("shows parsed value and position for contiguous axes", () => {
    expect(formatAxisValueLabel([0, 1, 2], 1)).toBe("1 (2/3)");
  });

  it("shows single-frame position label", () => {
    expect(formatAxisValueLabel([0], 0)).toBe("0 (1/1)");
  });

  it("prefers explicit axis labels for string channels", () => {
    expect(formatAxisValueLabel([0, 1], 0, ["DAPI", "GFP"])).toBe("DAPI (1/2)");
  });
});

describe("formatAxisAriaValueText", () => {
  it("includes axis value for sparse axes", () => {
    expect(formatAxisAriaValueText([0, 12, 24], 1)).toBe("12, frame 2 of 3");
  });

  it("includes axis value for contiguous axes", () => {
    expect(formatAxisAriaValueText([0, 1, 2], 1)).toBe("1, frame 2 of 3");
  });
});

describe("toAxisNavigationOptions", () => {
  it("labels sparse position values with coordinates", () => {
    expect(toAxisNavigationOptions([138, 144, 161])).toEqual([
      { value: 138, label: "138 (1/3)" },
      { value: 144, label: "144 (2/3)" },
      { value: 161, label: "161 (3/3)" },
    ]);
  });

  it("labels string channel values", () => {
    expect(toAxisNavigationOptions([0, 1], ["DAPI", "GFP"])).toEqual([
      { value: 0, label: "DAPI (1/2)" },
      { value: 1, label: "GFP (2/2)" },
    ]);
  });
});

describe("resolveAxisSelection", () => {
  it("returns the matching coordinate when present", () => {
    expect(resolveAxisSelection([138, 144, 161], 144)).toBe(144);
  });

  it("maps legacy axis indices to coordinates", () => {
    expect(resolveAxisSelection([138, 144, 161], 1)).toBe(144);
  });
});

describe("selectedAxisIndex", () => {
  it("finds index by coordinate", () => {
    expect(selectedAxisIndex([0, 12, 24], 12)).toBe(1);
  });

  it("accepts legacy axis indices", () => {
    expect(selectedAxisIndex([0, 12, 24], 2)).toBe(2);
  });
});

describe("createAxisIndexSliderControl", () => {
  it("builds slider props with sparse labels", () => {
    const onIndexChange = vi.fn();
    const control = createAxisIndexSliderControl({
      axisValues: [0, 12, 24],
      index: 1,
      onIndexChange,
    });

    expect(control.value).toBe(1);
    expect(control.max).toBe(2);
    expect(control.valueLabel).toBe("12 (2/3)");
    expect(control.previousDisabled).toBe(false);
    expect(control.nextDisabled).toBe(false);
  });

  it("uses explicit axis labels when provided", () => {
    const control = createAxisIndexSliderControl({
      axisValues: [0, 12, 24],
      axisLabels: ["000000000", "000000012", "000000024"],
      index: 1,
      onIndexChange: vi.fn(),
    });

    expect(control.valueLabel).toBe("000000012 (2/3)");
  });

  it("disables slider and steppers at bounds", () => {
    const onIndexChange = vi.fn();
    const first = createAxisIndexSliderControl({
      axisValues: [0, 12, 24],
      index: 0,
      onIndexChange,
    });
    const last = createAxisIndexSliderControl({
      axisValues: [0, 12, 24],
      index: 2,
      onIndexChange,
    });

    expect(first.previousDisabled).toBe(true);
    expect(first.nextDisabled).toBe(false);
    expect(last.previousDisabled).toBe(false);
    expect(last.nextDisabled).toBe(true);
  });

  it("disables slider for single-frame axes", () => {
    const control = createAxisIndexSliderControl({
      axisValues: [0],
      index: 0,
      onIndexChange: vi.fn(),
    });

    expect(control.disabled).toBe(true);
    expect(control.valueLabel).toBe("0 (1/1)");
  });

  it("clamps commit and stepping", () => {
    const onIndexChange = vi.fn();
    const control = createAxisIndexSliderControl({
      axisValues: [0, 12, 24],
      index: 1,
      onIndexChange,
    });

    control.onCommit?.(99);
    control.onPrevious();
    control.onNext();

    expect(onIndexChange).toHaveBeenNthCalledWith(1, 2);
    expect(onIndexChange).toHaveBeenNthCalledWith(2, 0);
    expect(onIndexChange).toHaveBeenNthCalledWith(3, 2);
  });

  it("respects external disabled state", () => {
    const control = createAxisIndexSliderControl({
      axisValues: [0, 12, 24],
      index: 1,
      disabled: true,
      onIndexChange: vi.fn(),
    });

    expect(control.disabled).toBe(true);
    expect(control.previousDisabled).toBe(true);
    expect(control.nextDisabled).toBe(true);
  });
});

describe("toNavigationOptions", () => {
  it("maps numeric values to labels", () => {
    expect(toNavigationOptions([1, 2, 3])).toEqual([
      { value: 1, label: "1" },
      { value: 2, label: "2" },
      { value: 3, label: "3" },
    ]);
  });
});

describe("findNavigationOptionIndex", () => {
  it("returns matching index or zero", () => {
    const options = toNavigationOptions([10, 20, 30]);
    expect(findNavigationOptionIndex(options, 20)).toBe(1);
    expect(findNavigationOptionIndex(options, 99)).toBe(0);
    expect(findNavigationOptionIndex([], 1)).toBe(-1);
  });
});

describe("stepNavigationValue", () => {
  it("steps within option bounds", () => {
    const options = toNavigationOptions([10, 20, 30]);
    expect(stepNavigationValue(options, 20, -1)).toBe(10);
    expect(stepNavigationValue(options, 20, 1)).toBe(30);
    expect(stepNavigationValue(options, 10, -1)).toBe(10);
  });
});

describe("formatNavigationOptionDisplayLabel", () => {
  it("strips zero padding from numeric axis labels", () => {
    expect(formatNavigationOptionDisplayLabel("000000012 (2/13)")).toBe("12 (2/13)");
    expect(formatNavigationOptionDisplayLabel("GFP (1/2)")).toBe("GFP (1/2)");
  });
});

describe("stripZeroPaddingFromNumericDisplay", () => {
  it("strips leading zeros from numeric strings", () => {
    expect(stripZeroPaddingFromNumericDisplay("00012")).toBe("12");
    expect(stripZeroPaddingFromNumericDisplay("GFP")).toBe("GFP");
  });
});
