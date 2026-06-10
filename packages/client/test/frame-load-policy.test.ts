import { describe, expect, it } from "vitest";

import {
  frameLoadRequest,
  shouldResetContrastBeforeNavigationLoad,
  shouldRunContrastFrameLoad,
} from "../src/session/frame-load-policy";

describe("frame-load-policy", () => {
  it("navigation loads with auto contrast (null request)", () => {
    expect(
      frameLoadRequest({
        kind: "navigation",
        contrast: { min: 10, max: 20 },
      }),
    ).toBeNull();
  });

  it("contrast reload keeps manual contrast", () => {
    const contrast = { min: 10, max: 20 };
    expect(frameLoadRequest({ kind: "contrast", contrast })).toEqual(contrast);
  });

  it("skips contrast-only reload when contrast is unset", () => {
    expect(shouldRunContrastFrameLoad(null)).toBe(false);
    expect(shouldRunContrastFrameLoad({ min: 1, max: 2 })).toBe(true);
  });

  it("resets contrast before navigation load", () => {
    expect(shouldResetContrastBeforeNavigationLoad()).toBe(true);
  });
});
