import { describe, expect, test } from "bun:test";

import {
  applyAlignSavedState,
  createAlignStore,
  excludeAlignCells,
  setAlignGrid,
} from "../../../src/shared/react";

describe("shared alignment store", () => {
  test("creates isolated store instances", () => {
    const first = createAlignStore();
    const second = createAlignStore();

    setAlignGrid(first, (grid) => ({ ...grid, enabled: true, tx: 12 }));
    excludeAlignCells(first, 2, [{ i: 1, j: 1 }]);

    expect(first.getState().grid.enabled).toBe(true);
    expect(first.getState().grid.tx).toBe(12);
    expect(first.getState().excludedCellsByPosition).toEqual({
      2: [{ i: 1, j: 1 }],
    });

    expect(second.getState().grid.enabled).toBe(false);
    expect(second.getState().grid.tx).toBe(0);
    expect(second.getState().excludedCellsByPosition).toEqual({});
  });

  test("saved align state updates only the target store", () => {
    const studioStore = createAlignStore();
    const viewerLikeStore = createAlignStore();

    applyAlignSavedState(studioStore, 5, {
      grid: {
        enabled: true,
        shape: "hex",
        tx: 3,
        ty: 4,
        rotation: 0.25,
        spacingA: 10,
        spacingB: 11,
        cellWidth: 12,
        cellHeight: 13,
        opacity: 0.5,
      },
      excludedCells: [{ i: 2, j: 3 }],
    });

    expect(studioStore.getState().grid.shape).toBe("hex");
    expect(studioStore.getState().excludedCellsByPosition).toEqual({
      5: [{ i: 2, j: 3 }],
    });
    expect(viewerLikeStore.getState().grid.shape).toBe("square");
    expect(viewerLikeStore.getState().excludedCellsByPosition).toEqual({});
  });
});
