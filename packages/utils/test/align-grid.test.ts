import { describe, expect, test } from "vite-plus/test";

import {
  alignGridBasis,
  applyAlignGridPointerGesture,
  applyAlignGridWheelGesture,
  beginAlignGridPointerGesture,
  classifyAlignGridPointerGesture,
  classifyAlignGridWheelGesture,
  collectAlignGridEdgePatterns,
  collectAlignGridStrokeTogglePatterns,
  countVisibleAlignGridPatterns,
  createDefaultAlignGrid,
  degreesToRadians,
  enumerateVisibleAlignGridPatterns,
  findAlignGridPatternAtPoint,
  mergeExcludedAlignGridPatterns,
  normalizeAlignGridState,
  normalizeRadians,
  setExcludedAlignGridPatternsForPosition,
  toggleExcludedAlignGridPatterns,
} from "../src";

function patternKey(pattern: { i: number; j: number }): string {
  return `${pattern.i}:${pattern.j}`;
}

describe("align grid utils", () => {
  test("normalizes grid inputs with rect naming", () => {
    const grid = normalizeAlignGridState({
      spacingA: -1,
      spacingB: 10,
      patternWidth: 12,
      patternHeight: 20,
      opacity: 10,
      enabled: true,
    });

    expect(grid.enabled).toBe(true);
    expect(grid.shape).toBe("rect");
    expect(grid.spacingA).toBe(1);
    expect(grid.spacingB).toBe(10);
    expect(grid.patternWidth).toBe(12);
    expect(grid.patternHeight).toBe(20);
    expect(grid.opacity).toBe(1);
  });

  test("returns rect basis at right angle", () => {
    const basis = alignGridBasis("rect", 0, 10, 20);
    expect(basis.a.x).toBeCloseTo(10);
    expect(basis.a.y).toBeCloseTo(0);
    expect(basis.b.x).toBeCloseTo(0, 6);
    expect(basis.b.y).toBeCloseTo(20, 6);
  });

  test("normalizes legacy square shape to rect", () => {
    const grid = normalizeAlignGridState({ shape: "square", enabled: true });
    expect(grid.shape).toBe("rect");

    const basis = alignGridBasis("square", 0, 10, 20);
    expect(basis.b.x).toBeCloseTo(0, 6);
    expect(basis.b.y).toBeCloseTo(20, 6);
  });

  test("keeps translated lattice patterns visible", () => {
    const patterns = enumerateVisibleAlignGridPatterns(
      { width: 100, height: 100 },
      normalizeAlignGridState({
        enabled: true,
        tx: 1000,
        ty: 0,
        spacingA: 50,
        spacingB: 50,
        patternWidth: 40,
        patternHeight: 40,
      }),
    );

    const ids = new Set(patterns.map(patternKey));
    expect(patterns).toHaveLength(9);
    expect(ids.has("-21:-1")).toBe(true);
    expect(ids.has("-20:0")).toBe(true);
    expect(ids.has("-19:1")).toBe(true);
  });

  test("finds and stroke-collects visible patterns once", () => {
    const frame = { width: 100, height: 100 };
    const grid = normalizeAlignGridState({
      enabled: true,
      spacingA: 50,
      spacingB: 50,
      patternWidth: 50,
      patternHeight: 50,
    });

    expect(findAlignGridPatternAtPoint(frame, grid, 1, 30)).toMatchObject({ i: -1, j: 0 });
    expect(findAlignGridPatternAtPoint(frame, grid, 150, 150)).toBeNull();

    const hitPatterns: { i: number; j: number }[] = [];
    for (const pattern of collectAlignGridStrokeTogglePatterns(
      frame,
      grid,
      { x: 1, y: 30 },
      { x: 60, y: 30 },
      hitPatterns,
    )) {
      hitPatterns.push(pattern);
    }
    for (const pattern of collectAlignGridStrokeTogglePatterns(
      frame,
      grid,
      { x: 60, y: 30 },
      { x: 1, y: 30 },
      hitPatterns,
    )) {
      hitPatterns.push(pattern);
    }

    expect(hitPatterns.map(patternKey)).toEqual(["-1:0", "0:0"]);
  });

  test("counts visible excluded patterns and collects clipped edge patterns", () => {
    const frame = { width: 100, height: 100 };
    const grid = normalizeAlignGridState({
      enabled: true,
      tx: -10,
      ty: -10,
      spacingA: 50,
      spacingB: 50,
      patternWidth: 50,
      patternHeight: 50,
    });

    const counts = countVisibleAlignGridPatterns(frame, grid, [{ i: 0, j: 0 }]);
    expect(counts.included).toBeGreaterThan(0);
    expect(counts.excluded).toBe(1);

    const edgeKeys = collectAlignGridEdgePatterns(frame, grid).map(patternKey);
    expect(edgeKeys).toContain("-1:0");
    expect(edgeKeys).toContain("0:-1");
    expect(edgeKeys).not.toContain("0:0");
  });

  test("applies pointer and wheel gestures", () => {
    const grid = createDefaultAlignGrid();
    const offsetSession = beginAlignGridPointerGesture(grid, {
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
      clientY: 200,
    });
    expect(offsetSession?.intent).toBe("offset");

    const moved = applyAlignGridPointerGesture(
      offsetSession!,
      {
        pointerId: 7,
        pointerType: "mouse",
        button: 0,
        clientX: 130,
        clientY: 180,
      },
      { displayWidth: 400, displayHeight: 200, modelWidth: 200, modelHeight: 100 },
    );

    expect(moved.tx).toBeCloseTo(15);
    expect(moved.ty).toBeCloseTo(-10);

    const rotationSession = beginAlignGridPointerGesture(grid, {
      pointerId: 8,
      pointerType: "mouse",
      button: 2,
      clientX: 100,
      clientY: 200,
    });
    const rotated = applyAlignGridPointerGesture(
      rotationSession!,
      {
        pointerId: 8,
        pointerType: "mouse",
        button: 2,
        clientX: 140,
        clientY: 200,
      },
      { displayWidth: 400, displayHeight: 400, modelWidth: 200, modelHeight: 200 },
    );
    expect(rotated.rotation).toBeCloseTo(normalizeRadians(degreesToRadians(22)));

    const resized = applyAlignGridWheelGesture(
      grid,
      { deltaMode: 1, deltaX: 0, deltaY: -1, ctrlKey: false, shiftKey: false },
      { displayWidth: 400, displayHeight: 400, modelWidth: 200, modelHeight: 200 },
    );
    expect(resized.patternWidth).toBeGreaterThan(grid.patternWidth);
  });

  test("maps active tools to primary-button grid gestures", () => {
    const grid = createDefaultAlignGrid();
    const input = {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
      clientY: 100,
    };

    expect(beginAlignGridPointerGesture(grid, input, "pan")?.intent).toBe("offset");
    expect(beginAlignGridPointerGesture(grid, input, "rotate")?.intent).toBe("rotation");
    expect(beginAlignGridPointerGesture(grid, input, "zoom-spacing")?.intent).toBe("spacing");
    expect(beginAlignGridPointerGesture(grid, input, "zoom-pattern")?.intent).toBe("size");
    expect(beginAlignGridPointerGesture(grid, { ...input, button: 2 }, "pan")).toBeNull();
    expect(
      beginAlignGridPointerGesture(grid, { ...input, pointerType: "touch" }, "pan")?.intent,
    ).toBe("offset");
  });

  test("uses horizontal pointer motion for split zoom tools", () => {
    const grid = createDefaultAlignGrid();
    const viewport = { displayWidth: 400, displayHeight: 400, modelWidth: 200, modelHeight: 200 };
    const input = {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
      clientY: 100,
    };
    const spacingSession = beginAlignGridPointerGesture(grid, input, "zoom-spacing");
    const patternSession = beginAlignGridPointerGesture(grid, input, "zoom-pattern");

    const spacingZoomed = applyAlignGridPointerGesture(
      spacingSession!,
      { ...input, clientX: 140, clientY: 100 },
      viewport,
    );
    expect(spacingZoomed.spacingA).toBeGreaterThan(grid.spacingA);
    expect(spacingZoomed.spacingB).toBeGreaterThan(grid.spacingB);
    expect(spacingZoomed.patternWidth).toBe(grid.patternWidth);
    expect(spacingZoomed.patternHeight).toBe(grid.patternHeight);

    const patternZoomed = applyAlignGridPointerGesture(
      patternSession!,
      { ...input, clientX: 140, clientY: 100 },
      viewport,
    );
    expect(patternZoomed.patternWidth).toBeGreaterThan(grid.patternWidth);
    expect(patternZoomed.patternHeight).toBeGreaterThan(grid.patternHeight);
    expect(patternZoomed.spacingA).toBe(grid.spacingA);
    expect(patternZoomed.spacingB).toBe(grid.spacingB);

    const covered = applyAlignGridPointerGesture(
      patternSession!,
      { ...input, clientX: 220, clientY: 100 },
      viewport,
    );
    expect(covered.patternWidth).toBeGreaterThan(covered.spacingA);
    expect(covered.patternHeight).toBeGreaterThan(covered.spacingB);
    expect(covered.spacingA).toBe(grid.spacingA);
    expect(covered.spacingB).toBe(grid.spacingB);

    const verticalOnlyPattern = applyAlignGridPointerGesture(
      patternSession!,
      { ...input, clientX: 100, clientY: 140 },
      viewport,
    );
    expect(verticalOnlyPattern.patternWidth).toBe(grid.patternWidth);
    expect(verticalOnlyPattern.patternHeight).toBe(grid.patternHeight);
  });

  test("classifies pointer and wheel gestures", () => {
    expect(classifyAlignGridPointerGesture({ pointerType: "mouse", button: 0 })).toBe("offset");
    expect(classifyAlignGridPointerGesture({ pointerType: "mouse", button: 1 })).toBe("spacing");
    expect(classifyAlignGridPointerGesture({ pointerType: "mouse", button: 2 })).toBe("rotation");
    expect(classifyAlignGridPointerGesture({ pointerType: "touch", button: 0 })).toBeNull();

    expect(
      classifyAlignGridWheelGesture({
        deltaMode: 1,
        deltaX: 0,
        deltaY: 1,
        ctrlKey: false,
        shiftKey: true,
      }),
    ).toBe("size");
    expect(
      classifyAlignGridWheelGesture({
        deltaMode: 0,
        deltaX: 12.5,
        deltaY: -24,
        ctrlKey: false,
        shiftKey: false,
      }),
    ).toBe("ignore");
  });

  test("merges, toggles, and stores excluded patterns by position", () => {
    expect(
      mergeExcludedAlignGridPatterns(
        [
          { i: 1, j: 0 },
          { i: 0, j: 1 },
        ],
        [
          { i: 1, j: 0 },
          { i: -1, j: 2 },
        ],
      ),
    ).toEqual([
      { i: -1, j: 2 },
      { i: 0, j: 1 },
      { i: 1, j: 0 },
    ]);

    expect(
      toggleExcludedAlignGridPatterns(
        [
          { i: 0, j: 0 },
          { i: 1, j: 0 },
        ],
        [
          { i: 1, j: 0 },
          { i: 2, j: 0 },
        ],
      ),
    ).toEqual([
      { i: 0, j: 0 },
      { i: 2, j: 0 },
    ]);

    const withPatterns = setExcludedAlignGridPatternsForPosition({}, 4, [{ i: 0, j: 0 }]);
    expect(withPatterns).toEqual({ 4: [{ i: 0, j: 0 }] });
    expect(setExcludedAlignGridPatternsForPosition(withPatterns, 4, [])).toEqual({});
  });
});
