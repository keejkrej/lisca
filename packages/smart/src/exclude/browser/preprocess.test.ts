import { describe, expect, it } from "vitest";

import { normalizeCellPixels } from "./preprocess";

describe("normalizeCellPixels", () => {
  it("min-max normalizes grayscale values into RGBA bytes", () => {
    const rgba = normalizeCellPixels(new Float32Array([0, 50, 100]));
    expect(rgba).toEqual(
      new Uint8ClampedArray([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]),
    );
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeCellPixels(new Float32Array())).toEqual(new Uint8ClampedArray());
  });
});
