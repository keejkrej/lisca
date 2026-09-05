import { describe, expect, it } from "vitest";

import { clientToFramePoint, computeFrameLayout, pixelToDisplayValue } from "../src/frame-display";

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

  it("renders a legible gradient for an inverted uint16 contrast window", () => {
    const frame = {
      width: 3,
      height: 1,
      pixels: new Uint16Array([10000, 30000, 50000]),
      pixelType: "uint16" as const,
      contrastDomain: { min: 0, max: 65535 },
      appliedContrast: { min: 50000, max: 10000 },
    };
    const low = pixelToDisplayValue(frame, 0);
    const mid = pixelToDisplayValue(frame, 1);
    const high = pixelToDisplayValue(frame, 2);
    expect(low).toBe(0);
    expect(high).toBe(255);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(255);
    expect(new Set([low, mid, high]).size).toBe(3);
  });

  it("does not collapse an inverted uint16 window to a binary threshold", () => {
    const frame = {
      width: 3,
      height: 1,
      pixels: new Uint16Array([10000, 30000, 49999]),
      pixelType: "uint16" as const,
      contrastDomain: { min: 0, max: 65535 },
      appliedContrast: { min: 50000, max: 10000 },
    };
    const values = [
      pixelToDisplayValue(frame, 0),
      pixelToDisplayValue(frame, 1),
      pixelToDisplayValue(frame, 2),
    ];
    const distinct = new Set(values);
    expect(distinct.size).toBeGreaterThan(1);
    expect(values[2]).toBeGreaterThan(values[0]);
  });

  it("maps an inverted window to the same gradient as the swapped ordered window", () => {
    const inverted = {
      width: 2,
      height: 1,
      pixels: new Uint16Array([10000, 50000]),
      pixelType: "uint16" as const,
      contrastDomain: { min: 0, max: 65535 },
      appliedContrast: { min: 50000, max: 10000 },
    };
    const ordered = {
      ...inverted,
      appliedContrast: { min: 10000, max: 50000 },
    };
    expect(pixelToDisplayValue(inverted, 0)).toBe(pixelToDisplayValue(ordered, 0));
    expect(pixelToDisplayValue(inverted, 1)).toBe(pixelToDisplayValue(ordered, 1));
  });

  it("renders a well-defined threshold for a zero-width uint16 contrast window", () => {
    const frame = {
      width: 3,
      height: 1,
      pixels: new Uint16Array([29999, 30000, 30001]),
      pixelType: "uint16" as const,
      contrastDomain: { min: 0, max: 65535 },
      appliedContrast: { min: 30000, max: 30000 },
    };
    expect(pixelToDisplayValue(frame, 0)).toBe(0);
    expect(pixelToDisplayValue(frame, 1)).toBe(0);
    expect(pixelToDisplayValue(frame, 2)).toBe(255);
  });

  it("does not regress ordered uint16 contrast mapping", () => {
    const frame = {
      width: 3,
      height: 1,
      pixels: new Uint16Array([10000, 30000, 50000]),
      pixelType: "uint16" as const,
      contrastDomain: { min: 0, max: 65535 },
      appliedContrast: { min: 10000, max: 50000 },
    };
    expect(pixelToDisplayValue(frame, 0)).toBe(0);
    expect(pixelToDisplayValue(frame, 1)).toBe(128);
    expect(pixelToDisplayValue(frame, 2)).toBe(255);
  });
});
