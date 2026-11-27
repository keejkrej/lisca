import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { Slider } from "../src/components/ui/slider";
import { cleanupMounted, mountTest } from "./render-helper";

afterEach(cleanupMounted);

const SliderHost = Html.component({
  name: "SliderHost",
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) => Slider(h, { ariaLabel: "Opacity", value: 50 }),
});

describe("Slider", () => {
  it("keeps the thumb exactly 16px at every breakpoint and exposes a range slider", async () => {
    const view = await mountTest(SliderHost, {});
    const thumb = view.container.querySelector('[data-slot="slider-thumb"]') as HTMLElement | null;

    expect(thumb).not.toBeNull();
    expect(thumb?.classList.contains("size-4")).toBe(true);
    expect(thumb?.classList.contains("size-5")).toBe(false);
    expect(thumb?.classList.contains("sm:size-4")).toBe(false);
    expect(thumb?.style.getPropertyValue("--slider-thumb-position")).toBe("50%");
    const input = view.container.querySelector('input[type="range"][aria-label="Opacity"]');
    expect(input).not.toBeNull();
  });
});
