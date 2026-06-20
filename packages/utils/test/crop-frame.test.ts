import { describe, expect, it } from "vitest";

import { cropFrameRegion } from "../src/crop-frame";

describe("cropFrameRegion", () => {
  it("extracts a rectangular region as uint16 pixels", () => {
    const frame = {
      width: 4,
      height: 3,
      pixels: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    };

    expect(Array.from(cropFrameRegion(frame, { x: 1, y: 1, w: 2, h: 2 }))).toEqual([5, 6, 9, 10]);
  });
});
