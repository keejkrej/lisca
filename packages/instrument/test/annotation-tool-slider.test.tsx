import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { AnnotationToolSlider } from "../src/annotate/annotation-tool-slider";

afterEach(cleanup);

describe("AnnotationToolSlider", () => {
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
