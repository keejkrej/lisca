import { describe, expect, test } from "bun:test";

import {
  applyGridPointerGesture,
  applyGridWheelGesture,
  beginGridPointerGesture,
  buildBboxCsv,
  classifyGridPointerGesture,
  classifyGridWheelGesture,
  collectEdgeCells,
  collectStrokeToggleCells,
  countVisibleCells,
  createDefaultGrid,
  degreesToRadians,
  enumerateVisibleGridCells,
  estimateGridDraw,
  findGridCellAtPoint,
  gridBasis,
  isMousePointerInput,
  isPrimaryMouseButton,
  normalizeRadians,
  normalizeGridState,
} from "../../../src/shared/core";

function cellKey(cell: { i: number; j: number }): string {
  return `${cell.i}:${cell.j}`;
}

describe("grid utils", () => {
  test("normalizes grid inputs", () => {
    const grid = normalizeGridState({
      spacingA: -1,
      spacingB: 10,
      cellWidth: 12,
      cellHeight: 20,
      opacity: 10,
      enabled: true,
    });
    expect(grid.enabled).toBe(true);
    expect(grid.spacingA).toBe(12);
    expect(grid.spacingB).toBe(12);
    expect(grid.opacity).toBe(1);
  });

  test("returns square basis at right angle", () => {
    const basis = gridBasis("square", 0, 10, 20);
    expect(basis.a.x).toBeCloseTo(10);
    expect(basis.a.y).toBeCloseTo(0);
    expect(basis.b.x).toBeCloseTo(0, 6);
    expect(basis.b.y).toBeCloseTo(20, 6);
  });

  test("does not cap dense grid previews", () => {
    const stats = estimateGridDraw(4096, 4096, 8, 8, 8000);
    expect(stats.estimated).toBeGreaterThan(8000);
    expect(stats.stride).toBe(1);
    expect(stats.capped).toBe(false);
  });

  test("enumerates dense grids without skipping neighboring cells", () => {
    const cells = enumerateVisibleGridCells(
      {
        width: 1024,
        height: 1024,
      },
      normalizeGridState({
        enabled: true,
        spacingA: 24,
        spacingB: 24,
        cellWidth: 16,
        cellHeight: 16,
      }),
    );

    const ids = new Set(cells.map(cellKey));
    expect(ids.has("0:0")).toBe(true);
    expect(ids.has("1:0")).toBe(true);
    expect(ids.has("0:1")).toBe(true);
    expect(ids.has("-1:0")).toBe(true);
  });

  test("default grid stays stable", () => {
    const grid = createDefaultGrid();
    expect(grid.shape).toBe("square");
    expect(grid.cellWidth).toBeGreaterThan(0);
  });

  test("classifies mouse wheel as size scaling", () => {
    expect(
      classifyGridWheelGesture({
        deltaMode: 1,
        deltaX: 0,
        deltaY: 1,
        ctrlKey: false,
        shiftKey: true,
      }),
    ).toBe("size");
  });

  test("classifies pixel-mode vertical wheel as size scaling", () => {
    expect(
      classifyGridWheelGesture({
        deltaMode: 0,
        deltaX: 0,
        deltaY: 3,
        ctrlKey: false,
        shiftKey: false,
      }),
    ).toBe("size");
  });

  test("classifies fractional vertical wheel as size scaling", () => {
    expect(
      classifyGridWheelGesture({
        deltaMode: 0,
        deltaX: 0,
        deltaY: 1.5,
        ctrlKey: false,
        shiftKey: false,
      }),
    ).toBe("size");
  });

  test("classifies mouse buttons as grid actions", () => {
    expect(classifyGridPointerGesture({ pointerType: "mouse", button: 0 })).toBe("offset");
    expect(classifyGridPointerGesture({ pointerType: "mouse", button: 1 })).toBe("spacing");
    expect(classifyGridPointerGesture({ pointerType: "mouse", button: 2 })).toBe("rotation");
    expect(classifyGridPointerGesture({ pointerType: "touch", button: 0 })).toBeNull();
    expect(classifyGridPointerGesture({ pointerType: "mouse", button: 4 })).toBeNull();
  });

  test("identifies mouse and primary button input", () => {
    expect(isMousePointerInput({ pointerType: "mouse", button: 2 })).toBe(true);
    expect(isMousePointerInput({ pointerType: "pen", button: 2 })).toBe(false);
    expect(isPrimaryMouseButton({ pointerType: "mouse", button: 0 })).toBe(true);
    expect(isPrimaryMouseButton({ pointerType: "mouse", button: 1 })).toBe(false);
  });

  test("beginGridPointerGesture with toolMode zoom maps primary button to spacing and size", () => {
    const grid = createDefaultGrid();
    const session = beginGridPointerGesture(
      grid,
      { pointerId: 1, pointerType: "mouse", button: 0, clientX: 0, clientY: 0 },
      "zoom",
    );
    expect(session?.intent).toBe("spacing-size");
  });

  test("beginGridPointerGesture with toolMode rotate maps primary button to rotation", () => {
    const grid = createDefaultGrid();
    const session = beginGridPointerGesture(
      grid,
      { pointerId: 1, pointerType: "mouse", button: 0, clientX: 100, clientY: 200 },
      "rotate",
    );
    expect(session?.intent).toBe("rotation");
  });

  test("beginGridPointerGesture with toolMode ignores non-primary buttons", () => {
    const grid = createDefaultGrid();
    expect(
      beginGridPointerGesture(
        grid,
        { pointerId: 1, pointerType: "mouse", button: 1, clientX: 100, clientY: 200 },
        "pan",
      ),
    ).toBeNull();
    expect(
      beginGridPointerGesture(
        grid,
        { pointerId: 1, pointerType: "mouse", button: 2, clientX: 100, clientY: 200 },
        "rotate",
      ),
    ).toBeNull();
  });

  test("applies left drag as offset movement", () => {
    const grid = createDefaultGrid();
    const session = beginGridPointerGesture(grid, {
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
      clientY: 200,
    });

    expect(session).not.toBeNull();
    const next = applyGridPointerGesture(
      session!,
      {
        pointerId: 7,
        pointerType: "mouse",
        button: 0,
        clientX: 130,
        clientY: 180,
      },
      {
        displayWidth: 400,
        displayHeight: 200,
        modelWidth: 200,
        modelHeight: 100,
      },
    );

    expect(next.tx).toBeCloseTo(15);
    expect(next.ty).toBeCloseTo(-10);
    expect(next.rotation).toBe(grid.rotation);
  });

  test("applies middle drag as spacing scaling", () => {
    const grid = createDefaultGrid();
    const session = beginGridPointerGesture(grid, {
      pointerId: 7,
      pointerType: "mouse",
      button: 1,
      clientX: 100,
      clientY: 200,
    });

    expect(session).not.toBeNull();
    const next = applyGridPointerGesture(
      session!,
      {
        pointerId: 7,
        pointerType: "mouse",
        button: 1,
        clientX: 140,
        clientY: 200,
      },
      {
        displayWidth: 400,
        displayHeight: 400,
        modelWidth: 200,
        modelHeight: 200,
      },
    );

    expect(next.spacingA).toBeGreaterThan(grid.spacingA);
    expect(next.spacingB).toBeGreaterThan(grid.spacingB);
    expect(next.cellWidth).toBe(grid.cellWidth);
  });

  test("applies right drag as rotation", () => {
    const grid = createDefaultGrid();
    const session = beginGridPointerGesture(grid, {
      pointerId: 7,
      pointerType: "mouse",
      button: 2,
      clientX: 100,
      clientY: 200,
    });

    expect(session).not.toBeNull();
    const next = applyGridPointerGesture(
      session!,
      {
        pointerId: 7,
        pointerType: "mouse",
        button: 2,
        clientX: 140,
        clientY: 200,
      },
      {
        displayWidth: 400,
        displayHeight: 400,
        modelWidth: 200,
        modelHeight: 200,
      },
    );

    expect(next.rotation).toBeCloseTo(normalizeRadians(degreesToRadians(22)));
    expect(next.tx).toBe(grid.tx);
  });

  test("applies toolMode zoom drag as spacing on x and box size on y", () => {
    const grid = createDefaultGrid();
    const session = beginGridPointerGesture(
      grid,
      {
        pointerId: 7,
        pointerType: "mouse",
        button: 0,
        clientX: 100,
        clientY: 200,
      },
      "zoom",
    );

    expect(session).not.toBeNull();
    const next = applyGridPointerGesture(
      session!,
      {
        pointerId: 7,
        pointerType: "mouse",
        button: 0,
        clientX: 140,
        clientY: 240,
      },
      {
        displayWidth: 400,
        displayHeight: 400,
        modelWidth: 200,
        modelHeight: 200,
      },
    );

    expect(next.spacingA).toBeGreaterThan(grid.spacingA);
    expect(next.spacingB).toBeGreaterThan(grid.spacingB);
    expect(next.cellWidth).toBeGreaterThan(grid.cellWidth);
    expect(next.cellHeight).toBeGreaterThan(grid.cellHeight);
    expect(next.rotation).toBe(grid.rotation);
  });

  test("ignores pinch gestures", () => {
    const grid = createDefaultGrid();
    const next = applyGridWheelGesture(
      grid,
      {
        deltaMode: 0,
        deltaX: 0,
        deltaY: -40,
        ctrlKey: true,
        shiftKey: false,
      },
      {
        displayWidth: 400,
        displayHeight: 400,
        modelWidth: 200,
        modelHeight: 200,
      },
    );

    expect(next).toEqual(grid);
  });

  test("ignores shift pinch gestures", () => {
    const grid = createDefaultGrid();
    const next = applyGridWheelGesture(
      grid,
      {
        deltaMode: 0,
        deltaX: 0,
        deltaY: -40,
        ctrlKey: true,
        shiftKey: true,
      },
      {
        displayWidth: 400,
        displayHeight: 400,
        modelWidth: 200,
        modelHeight: 200,
      },
    );

    expect(next).toEqual(grid);
  });

  test("ignores touchpad scroll", () => {
    const grid = createDefaultGrid();
    const next = applyGridWheelGesture(
      grid,
      {
        deltaMode: 0,
        deltaX: 12.5,
        deltaY: -24,
        ctrlKey: false,
        shiftKey: false,
      },
      {
        displayWidth: 400,
        displayHeight: 200,
        modelWidth: 200,
        modelHeight: 100,
      },
    );

    expect(next).toEqual(grid);
  });

  test("ignores shift touchpad scroll", () => {
    const grid = createDefaultGrid();
    const next = applyGridWheelGesture(
      grid,
      {
        deltaMode: 0,
        deltaX: 0.5,
        deltaY: 40,
        ctrlKey: false,
        shiftKey: true,
      },
      {
        displayWidth: 400,
        displayHeight: 400,
        modelWidth: 200,
        modelHeight: 200,
      },
    );

    expect(next).toEqual(grid);
  });

  test("keeps edge-touching cells visible", () => {
    const cells = enumerateVisibleGridCells(
      {
        width: 100,
        height: 100,
      },
      normalizeGridState({
        enabled: true,
        tx: 0,
        ty: 0,
        spacingA: 50,
        spacingB: 50,
        cellWidth: 50,
        cellHeight: 50,
      }),
    );

    expect(cells.some((cell) => cell.i === -1 && cell.j === 0 && cell.x === 0 && cell.y === 25)).toBe(true);
  });

  test("keeps translated lattice cells visible", () => {
    const cells = enumerateVisibleGridCells(
      {
        width: 100,
        height: 100,
      },
      normalizeGridState({
        enabled: true,
        tx: 1000,
        ty: 0,
        spacingA: 50,
        spacingB: 50,
        cellWidth: 40,
        cellHeight: 40,
      }),
    );

    const ids = new Set(cells.map(cellKey));
    expect(cells).toHaveLength(9);
    expect(ids.has("-21:-1")).toBe(true);
    expect(ids.has("-20:0")).toBe(true);
    expect(ids.has("-19:1")).toBe(true);
  });

  test("finds the clicked visible cell", () => {
    const frame = {
      width: 100,
      height: 100,
    };
    const grid = normalizeGridState({
      enabled: true,
      spacingA: 50,
      spacingB: 50,
      cellWidth: 50,
      cellHeight: 50,
    });

    const cell = findGridCellAtPoint(frame, grid, 1, 30);
    expect(cell).toMatchObject({ i: -1, j: 0 });
    expect(findGridCellAtPoint(frame, grid, 150, 150)).toBeNull();
  });

  test("collects stroke cells only once across a backtracked stroke", () => {
    const frame = {
      width: 100,
      height: 100,
    };
    const grid = normalizeGridState({
      enabled: true,
      spacingA: 50,
      spacingB: 50,
      cellWidth: 50,
      cellHeight: 50,
    });
    const hitCells: { i: number; j: number }[] = [];

    for (const cell of collectStrokeToggleCells(frame, grid, { x: 1, y: 30 }, { x: 60, y: 30 }, hitCells)) {
      hitCells.push(cell);
    }
    for (const cell of collectStrokeToggleCells(frame, grid, { x: 60, y: 30 }, { x: 1, y: 30 }, hitCells)) {
      hitCells.push(cell);
    }

    expect(hitCells.map(cellKey)).toEqual(["-1:0", "0:0"]);
  });

  test("counts included and excluded visible cells", () => {
    const counts = countVisibleCells(
      {
        width: 100,
        height: 100,
      },
      normalizeGridState({
        enabled: true,
        spacingA: 50,
        spacingB: 50,
        cellWidth: 50,
        cellHeight: 50,
      }),
      [{ i: 0, j: 0 }],
    );

    expect(counts.included).toBeGreaterThan(0);
    expect(counts.excluded).toBe(1);
  });

  test("collects edge cells with less than 80% of the target area visible", () => {
    const edgeCells = collectEdgeCells(
      {
        width: 100,
        height: 100,
      },
      normalizeGridState({
        enabled: true,
        tx: -10,
        ty: -10,
        spacingA: 50,
        spacingB: 50,
        cellWidth: 50,
        cellHeight: 50,
      }),
    );

    expect(edgeCells.map(cellKey)).toContain("-1:0");
    expect(edgeCells.map(cellKey)).toContain("0:-1");
    expect(edgeCells.map(cellKey)).not.toContain("0:0");
  });

  test("does not collect edge cells with exactly 80% of the target area visible", () => {
    const edgeCells = collectEdgeCells(
      {
        width: 100,
        height: 100,
      },
      normalizeGridState({
        enabled: true,
        tx: -10,
        ty: -10,
        spacingA: 100,
        spacingB: 100,
        cellWidth: 50,
        cellHeight: 50,
      }),
    );

    expect(edgeCells.map(cellKey)).not.toContain("-1:0");
    expect(edgeCells.map(cellKey)).not.toContain("0:-1");
    expect(edgeCells.map(cellKey)).not.toContain("0:0");
  });

  test("collects edge cells above the previous 50% cutoff but below 80%", () => {
    const edgeCells = collectEdgeCells(
      {
        width: 100,
        height: 100,
      },
      normalizeGridState({
        enabled: true,
        tx: -20,
        ty: -20,
        spacingA: 100,
        spacingB: 100,
        cellWidth: 50,
        cellHeight: 50,
      }),
    );

    expect(edgeCells.map(cellKey)).not.toContain("-1:0");
    expect(edgeCells.map(cellKey)).not.toContain("0:-1");
    expect(edgeCells.map(cellKey)).not.toContain("0:0");
  });

  test("builds bbox csv and clips edge-touching cells", () => {
    const csv = buildBboxCsv(
      {
        width: 100,
        height: 100,
      },
      normalizeGridState({
        enabled: true,
        spacingA: 50,
        spacingB: 50,
        cellWidth: 50,
        cellHeight: 50,
      }),
      [{ i: 0, j: 0 }],
    );

    const lines = csv.split("\n");
    expect(lines[0]).toBe("roi,x,y,w,h");
    expect(lines.some((line) => line === "1,0,25,25,50")).toBe(true);
    expect(lines.some((line) => line.includes(",25,25,50,50"))).toBe(false);
  });

  test("builds bbox csv with stable rounded cell sizes", () => {
    const csv = buildBboxCsv(
      {
        width: 800,
        height: 800,
      },
      normalizeGridState({
        enabled: true,
        tx: 0.33,
        ty: 0.67,
        spacingA: 120,
        spacingB: 120,
        cellWidth: 100.6,
        cellHeight: 80.6,
      }),
    );

    const lines = csv.split("\n").slice(1);
    const centralRow = lines
      .map((line) => line.split(","))
      .find((parts) => parts[1] === "350" && parts[2] === "360");

    expect(centralRow).toEqual(["24", "350", "360", "101", "81"]);
  });

  test("enumerates quantized visible grid cells", () => {
    const cells = enumerateVisibleGridCells(
      {
        width: 800,
        height: 800,
      },
      normalizeGridState({
        enabled: true,
        tx: 0.33,
        ty: 0.67,
        spacingA: 120,
        spacingB: 120,
        cellWidth: 100.6,
        cellHeight: 80.6,
      }),
    );

    const centerCell = cells.find((cell) => cell.i === 0 && cell.j === 0);
    expect(centerCell).toEqual({
      i: 0,
      j: 0,
      x: 350,
      y: 360,
      w: 101,
      h: 81,
    });
  });
});
