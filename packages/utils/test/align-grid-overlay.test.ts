import { describe, expect, test } from "vitest";

import {
  alignGridOverlayFillOpacity,
  buildAlignGridOverlayScene,
  createDefaultAlignGrid,
  normalizeAlignGridState,
} from "../src";

describe("align grid overlay scene", () => {
  test("returns null when grid is disabled", () => {
    const frame = { width: 100, height: 100, pixels: new Uint8Array(100 * 100) };
    const grid = normalizeAlignGridState({ ...createDefaultAlignGrid(), enabled: false });
    expect(buildAlignGridOverlayScene(frame, grid, 200, 200)).toBeNull();
  });

  test("moves origin with grid translation", () => {
    const frame = { width: 100, height: 100, pixels: new Uint8Array(100 * 100) };
    const grid = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      cellWidth: 16,
      cellHeight: 16,
      spacingA: 20,
      spacingB: 20,
      tx: 10,
      ty: -5,
    });
    const scene = buildAlignGridOverlayScene(frame, grid, 200, 200);
    expect(scene).not.toBeNull();
    const centered = buildAlignGridOverlayScene(
      frame,
      normalizeAlignGridState({ ...grid, tx: 0, ty: 0 }),
      200,
      200,
    );
    const scale = scene!.frameLayout.scale;
    expect(scene!.origin.x - centered!.origin.x).toBeCloseTo(10 * scale);
    expect(scene!.origin.y - centered!.origin.y).toBeCloseTo(-5 * scale);
  });

  test("scales vector endpoints with spacing", () => {
    const frame = { width: 100, height: 100, pixels: new Uint8Array(100 * 100) };
    const tight = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      cellWidth: 16,
      cellHeight: 16,
      spacingA: 20,
      spacingB: 20,
    });
    const wide = normalizeAlignGridState({
      ...tight,
      spacingA: 40,
      spacingB: 40,
    });
    const tightScene = buildAlignGridOverlayScene(frame, tight, 200, 200)!;
    const wideScene = buildAlignGridOverlayScene(frame, wide, 200, 200)!;
    const tightLen = Math.hypot(
      tightScene.vectorA.end.x - tightScene.origin.x,
      tightScene.vectorA.end.y - tightScene.origin.y,
    );
    const wideLen = Math.hypot(
      wideScene.vectorA.end.x - wideScene.origin.x,
      wideScene.vectorA.end.y - wideScene.origin.y,
    );
    expect(wideLen).toBeGreaterThan(tightLen);
  });

  test("partitions excluded cells", () => {
    const frame = { width: 200, height: 200, pixels: new Uint8Array(200 * 200) };
    const grid = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      spacingA: 20,
      spacingB: 20,
      cellWidth: 16,
      cellHeight: 16,
    });
    const scene = buildAlignGridOverlayScene(frame, grid, 400, 400, new Set(["0:0"]));
    expect(scene!.cells.some((cell) => cell.i === 0 && cell.j === 0 && cell.excluded)).toBe(true);
    expect(scene!.cells.some((cell) => cell.i === 1 && cell.j === 0 && !cell.excluded)).toBe(true);
  });

  test("computes halo rect around frame draw bounds", () => {
    const frame = { width: 100, height: 100, pixels: new Uint8Array(100 * 100) };
    const grid = normalizeAlignGridState({ ...createDefaultAlignGrid(), enabled: true });
    const scene = buildAlignGridOverlayScene(frame, grid, 200, 200)!;
    expect(scene.haloRect.w).toBeCloseTo(scene.frameLayout.drawWidth + 16);
    expect(scene.haloRect.h).toBeCloseTo(scene.frameLayout.drawHeight + 16);
  });

  test("derives fill opacity from grid opacity", () => {
    const grid = normalizeAlignGridState({ ...createDefaultAlignGrid(), opacity: 0.8 });
    expect(alignGridOverlayFillOpacity(grid)).toBeCloseTo(0.44);
  });
});
