import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { AlignGridFrameBounds } from "@lisca/utils";
import { normalizeAlignGridState } from "@lisca/utils";
import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import type { AlignCanvasPointerEvent } from "../src/align-canvas-handlers";
import { useAlignCanvasPointerHandlers } from "../src/align-pointer-handlers";
import { useAlignCanvasSelectionHandlers } from "../src/align-selection-handlers";

const frame: AlignGridFrameBounds = { width: 100, height: 100 };
const grid: AlignGridState = normalizeAlignGridState({
  enabled: true,
  spacingA: 50,
  spacingB: 50,
  cellWidth: 50,
  cellHeight: 50,
  tx: 0,
  ty: 0,
});

const cellKey = (cell: AlignGridCellCoord): string => `${cell.i}:${cell.j}`;

function makePointer(
  pointerId: number,
  point: { x: number; y: number } | null,
): AlignCanvasPointerEvent {
  return {
    pointerId,
    pointerType: "touch",
    button: 0,
    buttons: 1,
    clientX: point ? point.x : 0,
    clientY: point ? point.y : 0,
    framePoint: point === null ? null : { x: point.x, y: point.y },
    viewport: { displayWidth: 400, displayHeight: 400, modelWidth: 100, modelHeight: 100 },
    preventDefault: vi.fn(),
    capturePointer: vi.fn(),
    releasePointer: vi.fn(),
  };
}

type SelectionHandlers = ReturnType<typeof useAlignCanvasSelectionHandlers>;

function setupBrushHandlers() {
  let latest: AlignGridCellCoord[] = [];
  const onExcludedCellsChange = vi.fn((cells: AlignGridCellCoord[]) => {
    latest = cells;
  });
  let captured!: SelectionHandlers;
  render(() => {
    captured = useAlignCanvasSelectionHandlers(() => ({
      enabled: true,
      disabled: false,
      frame,
      grid,
      excludedCells: latest,
      onExcludedCellsChange,
    }));
    return null;
  });
  return { captured, getLatest: () => latest };
}

describe("useAlignCanvasSelectionHandlers", () => {
  it("rejects a second on-grid pointer while a stroke is in flight", () => {
    const { captured, getLatest } = setupBrushHandlers();

    // Pointer 1 starts the stroke and toggles (-1,0) on down, then (0,0) on move.
    expect(captured.handlePointerDown(makePointer(1, { x: 1, y: 30 }))).toBe(true);
    expect(captured.handlePointerMove(makePointer(1, { x: 60, y: 30 }))).toBe(true);
    expect(getLatest().map(cellKey).toSorted()).toEqual(["-1:0", "0:0"]);
    expect(captured.selecting()).toBe(true);

    // Pointer 2 goes down on a visible cell mid-stroke: must be rejected, not clobber.
    const before = [...getLatest()];
    const down2 = makePointer(2, { x: 1, y: 80 });
    expect(captured.handlePointerDown(down2)).toBe(false);
    expect(down2.capturePointer).not.toHaveBeenCalled();
    expect(down2.preventDefault).not.toHaveBeenCalled();
    expect(captured.selecting()).toBe(true);
    expect(getLatest()).toEqual(before);

    // Pointer 1 continues dragging and toggles (0,1) — its session survived the second down.
    expect(captured.handlePointerMove(makePointer(1, { x: 60, y: 80 }))).toBe(true);
    expect(getLatest().map(cellKey).toSorted()).toEqual(["-1:0", "0:0", "0:1"]);

    // Pointer 2's move is a no-op (it never captured the session).
    const before2 = [...getLatest()];
    expect(captured.handlePointerMove(makePointer(2, { x: 60, y: 80 }))).toBe(false);
    expect(getLatest()).toEqual(before2);

    // Pointer 1's release ends the stroke and releases the captured pointer.
    const up1 = makePointer(1, { x: 60, y: 80 });
    expect(captured.handlePointerEnd(up1)).toBe(true);
    expect(up1.releasePointer).toHaveBeenCalledOnce();
    expect(captured.selecting()).toBe(false);

    // Pointer 2's release is a no-op (already quiescent).
    const up2 = makePointer(2, { x: 60, y: 80 });
    expect(captured.handlePointerEnd(up2)).toBe(false);
    expect(up2.releasePointer).not.toHaveBeenCalled();

    // A fresh pointer 3 stroke behaves normally afterward — the handler is left quiescent.
    expect(captured.handlePointerDown(makePointer(3, { x: 1, y: 30 }))).toBe(true);
    expect(captured.selecting()).toBe(true);
    expect(captured.handlePointerEnd(makePointer(3, { x: 1, y: 30 }))).toBe(true);
    expect(captured.selecting()).toBe(false);
  });
});

describe("useAlignCanvasSelectionHandlers via useAlignCanvasPointerHandlers", () => {
  it("rejects a second touch while a manual-exclusion brush stroke is in flight", () => {
    let latest: AlignGridCellCoord[] = [];
    const onExcludedCellsChange = vi.fn((cells: AlignGridCellCoord[]) => {
      latest = cells;
    });
    let handlers!: ReturnType<typeof useAlignCanvasPointerHandlers>;
    render(() => {
      handlers = useAlignCanvasPointerHandlers(() => ({
        grid,
        setGrid: vi.fn(),
        toolMode: "pan",
        manualExclusionEnabled: true,
        excludedCells: latest,
        frame,
        onExcludedCellsChange,
      }));
      return null;
    });

    // Pointer 1 starts the brush and drags across two cells.
    handlers.handlePointerDown(makePointer(1, { x: 1, y: 30 }));
    handlers.handlePointerMove(makePointer(1, { x: 60, y: 30 }));
    expect(handlers.selecting()).toBe(true);
    expect(handlers.dragging()).toBe(false);
    expect(handlers.cursor()).toBe("crosshair");
    expect(latest.map(cellKey).toSorted()).toEqual(["-1:0", "0:0"]);

    // A second touch lands on a visible cell mid-stroke; the wrapper must not let it clobber.
    handlers.handlePointerDown(makePointer(2, { x: 1, y: 80 }));
    expect(handlers.selecting()).toBe(true);

    // Pointer 1 keeps dragging and the (0,1) cell is toggled — no silent drop.
    handlers.handlePointerMove(makePointer(1, { x: 60, y: 80 }));
    expect(latest.map(cellKey).toSorted()).toEqual(["-1:0", "0:0", "0:1"]);

    // Pointer 1 ends; the session clears. Pointer 2's release is a no-op.
    handlers.handlePointerEnd(makePointer(1, { x: 60, y: 80 }));
    expect(handlers.selecting()).toBe(false);
    handlers.handlePointerEnd(makePointer(2, { x: 60, y: 80 }));
    expect(handlers.selecting()).toBe(false);
    expect(handlers.dragging()).toBe(false);
  });
});
