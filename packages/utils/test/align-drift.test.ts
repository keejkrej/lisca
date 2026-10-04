import { describe, expect, test } from "vite-plus/test";

import {
  adjustAlignDriftTranslation,
  alignStateFromCurrent,
  applyDisplayedAlignGridCommit,
  createDefaultAlignGrid,
  effectiveAlignGrid,
  interpolateAlignDrift,
  isAlignDriftTranslationEditable,
  normalizeAlignDrift,
  normalizeAlignGridState,
  rebaseAlignDriftReference,
  upsertAlignDriftKeyframe,
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
    expect(
      alignStateFromCurrent(grid, [], { interpolation: "linear", keyframes: [] }).drift,
    ).toBeUndefined();
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

  test("pan on an interpolated time does not change the reference once a pin exists", () => {
    const grid = normalizeAlignGridState({ tx: 10, ty: 20, enabled: true });
    const drift = normalizeAlignDrift(worked);
    const time = 200;
    expect(isAlignDriftTranslationEditable(drift, time)).toBe(false);
    expect(isAlignDriftTranslationEditable(drift, 400)).toBe(true);
    const shown = effectiveAlignGrid(grid, drift, time);
    const preview = { ...shown, tx: shown.tx + 4, ty: shown.ty - 1 };
    const next = applyDisplayedAlignGridCommit(grid, drift, time, preview, "offset", shown);
    expect(next.grid).toBe(grid);
    expect(next.drift).toBe(drift);
    expect(next.grid.tx).toBe(10);
  });

  test("rotate does not bake the effective translation into the reference", () => {
    const grid = normalizeAlignGridState({ tx: 10, ty: 20, enabled: true });
    const drift = normalizeAlignDrift(worked);
    const time = 200;
    const shown = effectiveAlignGrid(grid, drift, time);
    expect(shown.tx).not.toBe(grid.tx);
    const preview = { ...shown, rotation: shown.rotation + 0.2 };
    const next = applyDisplayedAlignGridCommit(grid, drift, time, preview, "rotation", shown);
    expect(next.grid.tx).toBe(grid.tx);
    expect(next.grid.ty).toBe(grid.ty);
    expect(next.grid.rotation).toBeCloseTo(0.2);
    expect(next.drift).toBe(drift);
  });

  test("adds a pan to the reference when there are no pins and to the pin when one exists", () => {
    const grid = normalizeAlignGridState({ tx: 1, ty: 2, enabled: true });
    const open = adjustAlignDriftTranslation(grid, null, 200, 3, -1);
    expect(open.grid.tx).toBe(4);
    expect(open.grid.ty).toBe(1);
    expect(open.drift).toBeNull();

    const drift = normalizeAlignDrift(worked);
    const pinned = adjustAlignDriftTranslation(grid, drift, 400, 1, 2);
    expect(pinned.grid).toBe(grid);
    expect(pinned.drift?.keyframes.find((pin) => pin.time === 400)).toEqual({
      time: 400,
      dx: 7,
      dy: -0.5,
    });
    expect(pinned.drift?.keyframes.find((pin) => pin.time === 875)).toEqual({
      time: 875,
      dx: 14,
      dy: -4,
    });
  });

  test("set keyframe stores the interpolated delta and fills an unset reference", () => {
    const drift = normalizeAlignDrift(worked);
    const next = upsertAlignDriftKeyframe(drift, 200, null);
    expect(next?.referenceTime).toBe(0);
    expect(next?.keyframes.find((pin) => pin.time === 200)).toEqual({
      time: 200,
      dx: 3,
      dy: -1.25,
    });
    expect(interpolateAlignDrift(next, 200)).toEqual({ dx: 3, dy: -1.25 });
    expect(upsertAlignDriftKeyframe(null, 200, null)).toBeNull();
    expect(upsertAlignDriftKeyframe(null, 200, 875)?.referenceTime).toBe(875);
  });

  test("set reference keeps the on-screen translation and drops a zero pin at the new time", () => {
    const grid = normalizeAlignGridState({ tx: 10, ty: -4, enabled: true });
    const drift = normalizeAlignDrift(worked);
    const times = [0, 200, 400, 875, 900];
    const before = times.map((time) => effectiveAlignGrid(grid, drift, time));
    const next = rebaseAlignDriftReference(grid, drift, 400);
    times.forEach((time, index) => {
      const after = effectiveAlignGrid(next.grid, next.drift, time);
      expect(after.tx).toBeCloseTo(before[index]!.tx);
      expect(after.ty).toBeCloseTo(before[index]!.ty);
    });
    expect(next.drift?.referenceTime).toBe(400);
    expect(next.drift?.keyframes.find((pin) => pin.time === 400)).toBeUndefined();
    expect(next.drift?.keyframes.find((pin) => pin.time === 0)).toEqual({
      time: 0,
      dx: -6,
      dy: 2.5,
    });
    expect(rebaseAlignDriftReference(grid, drift, 0)).toEqual({ grid, drift });

    const empty = rebaseAlignDriftReference(grid, null, 200);
    expect(empty.grid).toBe(grid);
    expect(empty.drift).toEqual({
      referenceTime: 200,
      interpolation: "linear",
      keyframes: [],
    });
  });
});
