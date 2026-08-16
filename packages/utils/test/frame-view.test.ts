import { describe, expect, it } from "vitest";

import {
  computeFrameViewLayout,
  createFitFrameView,
  frameViewWheelFactor,
  zoomFrameViewAtPoint,
} from "../src";

describe("frame view geometry", () => {
  it("keeps the addressed frame pixel under the pointer while zooming", () => {
    const fit = createFitFrameView(100, 100);
    const point = { x: 60.25, y: 65.75 };
    const before = computeFrameViewLayout(100, 100, 100, 100, fit);
    const zoomed = zoomFrameViewAtPoint(fit, 2, point, 100, 100, 100, 100);
    const after = computeFrameViewLayout(100, 100, 100, 100, zoomed);

    expect(after.drawX + point.x * after.scale).toBeCloseTo(before.drawX + point.x * before.scale);
    expect(after.drawY + point.y * after.scale).toBeCloseTo(before.drawY + point.y * before.scale);
  });

  it("clamps zoom to fit and 16x and restores the centered fit layout", () => {
    const fit = createFitFrameView(120, 80);
    const maximum = zoomFrameViewAtPoint(fit, 100, { x: 60, y: 40 }, 240, 160, 120, 80);
    expect(maximum.zoom).toBe(16);

    const reset = zoomFrameViewAtPoint(maximum, 0.0001, { x: 60, y: 40 }, 240, 160, 120, 80);
    expect(reset).toEqual(fit);
    expect(computeFrameViewLayout(240, 160, 120, 80, reset)).toMatchObject({
      drawX: 0,
      drawY: 0,
      drawWidth: 240,
      drawHeight: 160,
      scale: 2,
    });
  });

  it("maps upward wheel movement to zoom-in and downward movement to zoom-out", () => {
    expect(frameViewWheelFactor(-120, 0, 400)).toBeGreaterThan(1);
    expect(frameViewWheelFactor(120, 0, 400)).toBeLessThan(1);
    expect(frameViewWheelFactor(-1, 1, 400)).toBeGreaterThan(1);
  });
});
