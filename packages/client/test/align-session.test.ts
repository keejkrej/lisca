import { createDefaultAlignGrid, normalizeAlignGridState } from "@lisca/utils";
import { describe, expect, it } from "vitest";

import {
  cellsBelowVariationThreshold,
  cropPositionsAfterSkip,
  deriveVisibleCounts,
  shouldApplySourceScan,
} from "../src/session/align-session.ts";

describe("align-session helpers", () => {
  it("shouldApplySourceScan returns true when keys differ", () => {
    expect(shouldApplySourceScan("a", "b")).toBe(true);
    expect(shouldApplySourceScan("a", "a")).toBe(false);
  });

  it("cropPositionsAfterSkip filters existing positions", () => {
    expect(cropPositionsAfterSkip([1, 2, 3], [2])).toEqual([1, 3]);
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
