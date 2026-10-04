import { describe, expect, test } from "vite-plus/test";

import {
  alignStateFromCurrent,
  createDefaultAlignGrid,
  effectiveAlignGrid,
  interpolateAlignDrift,
  normalizeAlignDrift,
  normalizeAlignGridState,
} from "../src";

const worked = {
  referenceTime: 0,
  interpolation: "linear" as const,
  keyframes: [
    { time: 400, dx: 6, dy: -2.5 },
    { time: 875, dx: 14, dy: -4 },
  ],
};

describe("align drift", () => {
  test("interpolates linearly from the reference and holds past the last pin", () => {
    const drift = normalizeAlignDrift(worked);
    expect(interpolateAlignDrift(drift, 0)).toEqual({ dx: 0, dy: 0 });
    expect(interpolateAlignDrift(drift, 200)).toEqual({ dx: 3, dy: -1.25 });
    expect(interpolateAlignDrift(drift, 400)).toEqual({ dx: 6, dy: -2.5 });
    expect(interpolateAlignDrift(drift, 875)).toEqual({ dx: 14, dy: -4 });
    expect(interpolateAlignDrift(drift, 900)).toEqual({ dx: 14, dy: -4 });
  });

  test("uses an explicit pin at the reference time and ignores keyframe order", () => {
    const drift = normalizeAlignDrift({
      referenceTime: 0,
      interpolation: "linear",
      keyframes: [
        { time: 875, dx: 14, dy: -4 },
        { time: 0, dx: 2, dy: -1 },
        { time: 400, dx: 6, dy: -2.5 },
      ],
    });
    expect(interpolateAlignDrift(drift, 0)).toEqual({ dx: 2, dy: -1 });
    expect(interpolateAlignDrift(drift, 200)).toEqual({ dx: 4, dy: -1.75 });
  });

  test("keeps an empty keyframe list and evaluates it as zero", () => {
    const drift = normalizeAlignDrift({
      referenceTime: 875,
      interpolation: "linear",
      keyframes: [],
    });
    expect(drift).toEqual({
      referenceTime: 875,
      interpolation: "linear",
      keyframes: [],
    });
    expect(interpolateAlignDrift(drift, 0)).toEqual({ dx: 0, dy: 0 });
    expect(interpolateAlignDrift(drift, 875)).toEqual({ dx: 0, dy: 0 });
    expect(interpolateAlignDrift(drift, 900)).toEqual({ dx: 0, dy: 0 });
    expect(normalizeAlignDrift(null)).toBeNull();
    expect(normalizeAlignDrift(undefined)).toBeNull();
  });

  test("rejects duplicate times, non-finite deltas, negative times, and too many keyframes", () => {
    expect(() =>
      normalizeAlignDrift({
        referenceTime: 0,
        interpolation: "linear",
        keyframes: [
          { time: 400, dx: 1, dy: 2 },
          { time: 400, dx: 3, dy: 4 },
        ],
      }),
    ).toThrow(/duplicate keyframe time 400/);
    expect(() =>
      normalizeAlignDrift({
        referenceTime: 0,
        interpolation: "linear",
        keyframes: [{ time: 1, dx: Number.NaN, dy: 0 }],
      }),
    ).toThrow(/finite/);
    expect(() =>
      normalizeAlignDrift({
        referenceTime: 0,
        interpolation: "linear",
        keyframes: [{ time: -1, dx: 0, dy: 0 }],
      }),
    ).toThrow(/non-negative integer/);
    expect(() =>
      normalizeAlignDrift({
        referenceTime: -5,
        interpolation: "linear",
        keyframes: [],
      }),
    ).toThrow(/referenceTime/);
    const keyframes = Array.from({ length: 4097 }, (_, time) => ({ time, dx: 0, dy: 0 }));
    expect(() =>
      normalizeAlignDrift({ referenceTime: 0, interpolation: "linear", keyframes }),
    ).toThrow(/4096/);
  });

  test("omits empty drift only for an absent reference or a passed assay default", () => {
    const grid = createDefaultAlignGrid();
    const emptyAt = (referenceTime: number) => ({
      referenceTime,
      interpolation: "linear" as const,
      keyframes: [],
    });
    expect(alignStateFromCurrent(grid, [], emptyAt(0), 0).drift).toBeUndefined();
    expect(alignStateFromCurrent(grid, [], emptyAt(875), 0).drift).toEqual(emptyAt(875));
    expect(alignStateFromCurrent(grid, [], emptyAt(0)).drift).toEqual(emptyAt(0));
    expect(alignStateFromCurrent(grid, [], emptyAt(875)).drift).toEqual(emptyAt(875));
    expect(alignStateFromCurrent(grid, [], emptyAt(0), null).drift).toEqual(emptyAt(0));
    expect(alignStateFromCurrent(grid, []).drift).toBeUndefined();
    expect(alignStateFromCurrent(grid, [], { interpolation: "linear", keyframes: [] }).drift).toBeUndefined();
    expect(alignStateFromCurrent(grid, [], worked, 0).drift).toEqual(worked);
  });

  test("returns the same grid when the drift delta is zero", () => {
    const grid = normalizeAlignGridState({ tx: -14.24, ty: -3.56, enabled: true });
    const empty = normalizeAlignDrift({
      referenceTime: 0,
      interpolation: "linear",
      keyframes: [],
    });
    expect(effectiveAlignGrid(grid, empty, 200)).toBe(grid);
    expect(effectiveAlignGrid(grid, null, 200)).toBe(grid);
    const shifted = effectiveAlignGrid(grid, normalizeAlignDrift(worked), 200);
    expect(shifted).not.toBe(grid);
    expect(shifted.tx).toBeCloseTo(grid.tx + 3);
    expect(shifted.ty).toBeCloseTo(grid.ty - 1.25);
    expect(shifted.rotation).toBe(grid.rotation);
  });
});
