import { describe, expect, it } from "vite-plus/test";

import { normalizePatternPixels } from "./preprocess";

describe("normalizePatternPixels", () => {
  it("min-max normalizes grayscale values into RGBA bytes", () => {
    const rgba = normalizePatternPixels(new Float32Array([0, 50, 100]));
    expect(rgba).toEqual(
      new Uint8ClampedArray([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]),
    );
  });

  it("returns an empty array for empty input", () => {
    expect(normalizePatternPixels(new Float32Array())).toEqual(new Uint8ClampedArray());
  });
});
