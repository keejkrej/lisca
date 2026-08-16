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

  it("uses the 12px/16px control-label type rhythm", () => {
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

    expect(label.classList.contains("text-xs")).toBe(true);
    expect(label.classList.contains("leading-4")).toBe(true);
    expect(label.classList.contains("leading-tight")).toBe(false);
  });
});
