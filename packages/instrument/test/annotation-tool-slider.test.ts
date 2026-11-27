import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { AnnotationToolSlider } from "../src/annotate/annotation-tool-slider";
import { cleanupMounted, mountTest } from "./render-helper";

afterEach(cleanupMounted);

const SliderMsg = UiSchema.TaggedEnum({
  Changed: { value: Schema.Number },
});

const SliderHost = Html.component({
  name: "AnnotationToolSliderTestHost",
  model: Schema.Struct({ value: Schema.Number }),
  message: SliderMsg,
}).make({
  init: () => ({ value: 0.65 }),
  update: {
    Changed: ($, { value }) => $.evolve({ value }),
  },
  view: (h, model) =>
    AnnotationToolSlider(h, {
      label: "Opacity",
      max: 1,
      min: 0,
      step: 0.01,
      value: model.value,
      valueLabel: `${Math.round(model.value * 100)}%`,
      onChange: (value) => SliderMsg.Changed({ value }),
    }),
});

describe("AnnotationToolSlider", () => {
  it("uses FieldLabel ink for the control name and muted for the value", async () => {
    const view = await mountTest(SliderHost, {});
    const spans = Array.from(view.container.querySelectorAll("span"));
    const label = spans.find((el) => el.textContent === "Opacity")!;
    const value = spans.find((el) => el.textContent === "65%")!;
    const fieldLabel = label.closest('[data-slot="field-label"]');

    expect(label).toBeDefined();
    expect(value).toBeDefined();
    expect(fieldLabel).not.toBeNull();
    expect(label.classList.contains("text-muted-foreground")).toBe(false);
    expect(value.classList.contains("text-muted-foreground")).toBe(true);
  });
});
