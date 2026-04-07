import { describe, expect, test } from "bun:test";

import {
  clearExcludedCellIds,
  mergeExcludedCellIds,
  setExcludedCellIdsForPosition,
  toggleExcludedCellIds,
} from "../../../src/viewer/core";

describe("excluded cell helpers", () => {
  test("toggle adds and removes ids deterministically", () => {
    expect(toggleExcludedCellIds(["a", "b"], ["b", "c"])).toEqual(["a", "c"]);
  });

  test("merge is idempotent and sorted", () => {
    expect(mergeExcludedCellIds(["b"], ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  test("position updates drop empty entries", () => {
    const state = setExcludedCellIdsForPosition(clearExcludedCellIds(), 3, ["b", "a"]);
    expect(state).toEqual({ 3: ["a", "b"] });
    expect(setExcludedCellIdsForPosition(state, 3, [])).toEqual({});
  });
});
