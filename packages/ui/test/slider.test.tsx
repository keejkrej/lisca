import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { Slider } from "../src/components/ui/slider";

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
});
