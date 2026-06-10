import { describe, expect, it } from "vitest";

import {
  clientToFramePoint,
  computeFrameLayout,
  pixelToDisplayValue,
} from "../src/frame-display";

describe("frame-display", () => {
  it("letterboxes frame in viewport", () => {
    const layout = computeFrameLayout(200, 100, 100, 100);
    expect(layout.drawWidth).toBe(100);
    expect(layout.drawHeight).toBe(100);
    expect(layout.drawX).toBe(50);
    expect(layout.drawY).toBe(0);
  });

  it("maps client coordinates to frame points", () => {
    const layout = computeFrameLayout(200, 200, 100, 100);
    expect(clientToFramePoint(100, 100, layout, 0, 0)).toEqual({ x: 50, y: 50 });

    const letterboxed = computeFrameLayout(200, 100, 100, 100);
    expect(clientToFramePoint(10, 10, letterboxed, 0, 0)).toBeNull();
  });

  it("applies contrast when mapping pixel values", () => {
    const value = pixelToDisplayValue(
      {
        width: 1,
        height: 1,
        pixels: new Uint8Array([200]),
        contrastDomain: { min: 0, max: 1000 },
        suggestedContrast: { min: 100, max: 900 },
        appliedContrast: { min: 100, max: 900 },
      },
      0,
    );
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(255);
  });
});
