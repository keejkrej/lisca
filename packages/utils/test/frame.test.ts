import { describe, expect, it } from "vitest";

import { orderedContrastWindow } from "../src/frame";

const DOMAIN = { min: 0, max: 65535 };

describe("orderedContrastWindow", () => {
  it("leaves an already-ordered in-domain window unchanged", () => {
    expect(orderedContrastWindow({ min: 30000, max: 40000 }, DOMAIN)).toEqual({
      min: 30000,
      max: 40000,
    });
  });

  it("swaps endpoints when min > max so the rescale stays legible", () => {
    expect(orderedContrastWindow({ min: 50000, max: 10000 }, DOMAIN)).toEqual({
      min: 10000,
      max: 50000,
    });
  });

  it("expands a zero-width window to a minimum-width ordered window", () => {
    expect(orderedContrastWindow({ min: 30000, max: 30000 }, DOMAIN)).toEqual({
      min: 30000,
      max: 30001,
    });
  });

  it("expands a zero-width window at the domain floor upward", () => {
    expect(orderedContrastWindow({ min: 0, max: 0 }, DOMAIN)).toEqual({ min: 0, max: 1 });
  });

  it("expands a zero-width window at the domain ceiling downward", () => {
    expect(orderedContrastWindow({ min: 65535, max: 65535 }, DOMAIN)).toEqual({
      min: 65534,
      max: 65535,
    });
  });

  it("always returns a window with min < max for a non-degenerate domain", () => {
    const cases: Array<{ min: number; max: number }> = [
      { min: 50000, max: 10000 },
      { min: 10000, max: 50000 },
      { min: 30000, max: 30000 },
      { min: 0, max: 0 },
      { min: 65535, max: 65535 },
      { min: 65535, max: 0 },
      { min: 0, max: 65535 },
      { min: -1000, max: 70000 },
      { min: 70000, max: -1000 },
    ];
    for (const window of cases) {
      const result = orderedContrastWindow(window, DOMAIN);
      expect(result.min).toBeLessThan(result.max);
      expect(result.min).toBeGreaterThanOrEqual(DOMAIN.min);
      expect(result.max).toBeLessThanOrEqual(DOMAIN.max);
    }
  });

  it("clamps out-of-domain endpoints before ordering", () => {
    expect(orderedContrastWindow({ min: -1000, max: 70000 }, DOMAIN)).toEqual({
      min: 0,
      max: 65535,
    });
    expect(orderedContrastWindow({ min: 70000, max: -1000 }, DOMAIN)).toEqual({
      min: 0,
      max: 65535,
    });
  });

  it("rounds non-integer endpoints", () => {
    expect(orderedContrastWindow({ min: 30000.4, max: 40000.6 }, DOMAIN)).toEqual({
      min: 30000,
      max: 40001,
    });
  });

  it("handles a uint8 domain", () => {
    expect(orderedContrastWindow({ min: 200, max: 200 }, { min: 0, max: 255 })).toEqual({
      min: 200,
      max: 201,
    });
    expect(orderedContrastWindow({ min: 200, max: 50 }, { min: 0, max: 255 })).toEqual({
      min: 50,
      max: 200,
    });
    expect(orderedContrastWindow({ min: 255, max: 255 }, { min: 0, max: 255 })).toEqual({
      min: 254,
      max: 255,
    });
  });

  it("does not produce NaN or out-of-domain values for a degenerate domain", () => {
    const result = orderedContrastWindow({ min: 5, max: 5 }, { min: 5, max: 5 });
    expect(Number.isFinite(result.min)).toBe(true);
    expect(Number.isFinite(result.max)).toBe(true);
    expect(result.min).toBeGreaterThanOrEqual(5);
    expect(result.max).toBeLessThanOrEqual(5);
  });
});
