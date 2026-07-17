import { describe, expect, it } from "vitest";

import { frameLoadRequest, shouldRunContrastFrameLoad } from "../src/session/frame-load-policy";

describe("frame-load-policy", () => {
  it("navigation with null contrast loads auto contrast", () => {
    expect(frameLoadRequest(null)).toBeNull();
  });

  it("contrast reload keeps manual contrast", () => {
    const contrast = { min: 10, max: 20 };
    expect(frameLoadRequest(contrast)).toEqual(contrast);
  });

  it("skips contrast-only reload when contrast is unset", () => {
    expect(shouldRunContrastFrameLoad(null)).toBe(false);
    expect(shouldRunContrastFrameLoad({ min: 1, max: 2 })).toBe(true);
  });
});
