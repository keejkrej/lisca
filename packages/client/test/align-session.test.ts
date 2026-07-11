import { createDefaultAlignGrid, normalizeAlignGridState } from "@lisca/utils";
import { describe, expect, it } from "vitest";

import {
  allAlignPositionsSaved,
  cellsBelowVariationThreshold,
  cropPositionsAfterSkip,
  deriveVisibleCounts,
  nextAlignPosition,
  resolveFirstUnalignedTarget,
  shouldApplySourceScan,
} from "../src/session/align-session";

describe("align-session helpers", () => {
  it("shouldApplySourceScan returns true when keys differ", () => {
    expect(shouldApplySourceScan("a", "b")).toBe(true);
    expect(shouldApplySourceScan("a", "a")).toBe(false);
  });

  it("cropPositionsAfterSkip filters existing positions", () => {
    expect(cropPositionsAfterSkip([1, 2, 3], [2])).toEqual([1, 3]);
  });

  it("resolves Studio's first-unaligned target and falls back to the final position", () => {
    expect(resolveFirstUnalignedTarget([2, 4, 6], new Set([2]))).toBe(4);
    expect(resolveFirstUnalignedTarget([2, 4, 6], new Set([2, 4, 6]))).toBe(6);
    expect(resolveFirstUnalignedTarget([], new Set())).toBeNull();
  });

  it("advances only from a position in assay order", () => {
    expect(nextAlignPosition([2, 4, 6], 4)).toBe(6);
    expect(nextAlignPosition([2, 4, 6], 6)).toBeNull();
    expect(nextAlignPosition([2, 4, 6], 3)).toBeNull();
  });

  it("offers final crop only when every non-empty assay position is saved", () => {
    expect(allAlignPositionsSaved([2, 4], new Set([2, 4]))).toBe(true);
    expect(allAlignPositionsSaved([2, 4], new Set([2]))).toBe(false);
    expect(allAlignPositionsSaved([], new Set())).toBe(false);
  });

  it("cellsBelowVariationThreshold maps scores to cell coords", () => {
    const cells = cellsBelowVariationThreshold(
      {
        threshold: 5,
        eligibleCellCount: 2,
        cellScores: [
          { i: 0, j: 0, score: 1 },
          { i: 1, j: 1, score: 9 },
        ],
      },
      5,
    );
    expect(cells).toEqual([{ i: 0, j: 0 }]);
  });

  it("deriveVisibleCounts returns zeros without frame", () => {
    expect(
      deriveVisibleCounts(null, normalizeAlignGridState(createDefaultAlignGrid()), []),
    ).toEqual({ included: 0, excluded: 0 });
  });
});
