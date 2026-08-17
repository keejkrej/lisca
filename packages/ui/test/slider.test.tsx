import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { Slider } from "../src/components/ui/slider";
import { AnnotationToolSlider } from "../src/features/annotate/annotation-tool-slider";

afterEach(cleanup);

describe("Slider", () => {
  it("keeps the thumb exactly 16px at every breakpoint", () => {
    const view = render(() => <Slider aria-label="Opacity" value={50} />);
    const thumb = view.container.querySelector('[data-slot="slider-thumb"]');

    expect(thumb).not.toBeNull();
    expect(thumb?.classList.contains("size-4")).toBe(true);
    expect(thumb?.classList.contains("size-5")).toBe(false);
    expect(thumb?.classList.contains("sm:size-4")).toBe(false);
    expect(thumb?.classList.contains("data-[orientation=horizontal]:-mt-2")).toBe(true);
    expect(thumb?.classList.contains("data-[orientation=vertical]:-ml-2")).toBe(true);
    expect(view.getByRole("slider", { name: "Opacity" })).toBeTruthy();
  });

  it("uses FieldLabel ink for the control name and muted for the value", () => {
    const view = render(() => (
      <AnnotationToolSlider
        label="Opacity"
        max={1}
        min={0}
        step={0.01}
        value={0.65}
        valueLabel="65%"
        onChange={() => undefined}
      />
    ));
    const label = view.getByText("Opacity");
    const value = view.getByText("65%");
    const fieldLabel = label.closest('[data-slot="field-label"]');

    expect(fieldLabel).not.toBeNull();
    expect(label.classList.contains("text-muted-foreground")).toBe(false);
    expect(value.classList.contains("text-muted-foreground")).toBe(true);
  });
});
