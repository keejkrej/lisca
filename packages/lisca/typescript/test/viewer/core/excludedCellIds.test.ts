import { describe, expect, test } from "bun:test";

import {
  clearExcludedCells,
  mergeExcludedCells,
  setExcludedCellsForPosition,
  toggleExcludedCells,
} from "../../../src/shared/core";

describe("excluded cell helpers", () => {
  test("toggle adds and removes coords deterministically", () => {
    expect(
      toggleExcludedCells(
        [
          { i: 0, j: 0 },
          { i: 0, j: 1 },
        ],
        [
          { i: 0, j: 1 },
          { i: 1, j: 0 },
        ],
      ),
    ).toEqual([
      { i: 0, j: 0 },
      { i: 1, j: 0 },
    ]);
  });

  test("merge is idempotent and sorted", () => {
    expect(
      mergeExcludedCells([{ i: 0, j: 1 }], [{ i: 0, j: 0 }, { i: 0, j: 1 }, { i: 1, j: 0 }]),
    ).toEqual([
      { i: 0, j: 0 },
      { i: 0, j: 1 },
      { i: 1, j: 0 },
    ]);
  });

  test("position updates drop empty entries", () => {
    const state = setExcludedCellsForPosition(clearExcludedCells(), 3, [
      { i: 0, j: 1 },
      { i: 0, j: 0 },
    ]);
    expect(state).toEqual({ 3: [{ i: 0, j: 0 }, { i: 0, j: 1 }] });
    expect(setExcludedCellsForPosition(state, 3, [])).toEqual({});
  });
});
