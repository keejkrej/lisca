import { createDefaultAlignGrid, normalizeAlignGridState } from "@lisca/utils";
import { describe, expect, it } from "vitest";

import {
  allAlignPositionsSaved,
  applyDockVariationExcludeWithEdge,
  applyVariationExcludePreview,
  applyVariationExcludeWithEdge,
  cellsBelowVariationThreshold,
  cropPositionsAfterSkip,
  deriveVisibleCounts,
  mergeAlignGridEdgeExclusion,
  mergeAutoExcludedAlignCells,
  nextAlignPosition,
  resolveFirstUnalignedTarget,
  shouldApplySourceScan,
  updateVariationExcludeThreshold,
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

  it("updateVariationExcludeThreshold preserves preview while changing threshold", () => {
    const preview = {
      preview: {
        threshold: 5,
        eligibleCellCount: 1,
        cellScores: [{ i: 0, j: 0, score: 1 }],
      },
      threshold: 5,
    };
    expect(updateVariationExcludeThreshold(preview, 3)).toEqual({
      ...preview,
      threshold: 3,
    });
    expect(updateVariationExcludeThreshold(null, 3)).toBeNull();
  });

  it("applyVariationExcludePreview merges variation cells into current exclusions", () => {
    const applied = applyVariationExcludePreview([{ i: 2, j: 2 }], {
      preview: {
        threshold: 5,
        eligibleCellCount: 2,
        cellScores: [
          { i: 0, j: 0, score: 1 },
          { i: 1, j: 1, score: 9 },
        ],
      },
      threshold: 5,
    });
    expect(applied.variationCells).toEqual([{ i: 0, j: 0 }]);
    expect(applied.eligibleCellCount).toBe(2);
    expect(applied.cells).toEqual(
      expect.arrayContaining([
        { i: 0, j: 0 },
        { i: 2, j: 2 },
      ]),
    );
    expect(applied.cells).toHaveLength(2);
  });

  it("mergeAlignGridEdgeExclusion adds visible edge cells", () => {
    const frame = {
      width: 4,
      height: 4,
      pixels: new Uint8Array(16),
      contrastDomain: { min: 0, max: 255 },
    };
    const grid = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      cellWidth: 2,
      cellHeight: 2,
      spacingA: 2,
      spacingB: 2,
    });
    const merged = mergeAlignGridEdgeExclusion([], frame, grid);
    expect(merged.length).toBeGreaterThan(0);
  });

  it("applyDockVariationExcludeWithEdge replaces prior exclusions", () => {
    const frame = {
      width: 4,
      height: 4,
      pixels: new Uint8Array(16),
      contrastDomain: { min: 0, max: 255 },
    };
    const grid = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      cellWidth: 2,
      cellHeight: 2,
      spacingA: 2,
      spacingB: 2,
    });
    const preview = {
      preview: {
        threshold: 5,
        eligibleCellCount: 1,
        cellScores: [{ i: 0, j: 0, score: 1 }],
      },
      threshold: 5,
    };
    const applied = applyDockVariationExcludeWithEdge(frame, grid, preview);
    expect(applied.cells).not.toEqual(expect.arrayContaining([{ i: 2, j: 2 }]));
    expect(applied.variationCells).toEqual([{ i: 0, j: 0 }]);
  });

  it("applyVariationExcludeWithEdge pairs var exclude with edge exclude", () => {
    const frame = {
      width: 4,
      height: 4,
      pixels: new Uint8Array(16),
      contrastDomain: { min: 0, max: 255 },
    };
    const grid = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      cellWidth: 2,
      cellHeight: 2,
      spacingA: 2,
      spacingB: 2,
    });
    const preview = {
      preview: {
        threshold: 5,
        eligibleCellCount: 1,
        cellScores: [{ i: 0, j: 0, score: 1 }],
      },
      threshold: 5,
    };
    const applied = applyVariationExcludeWithEdge([], frame, grid, preview);
    expect(applied.variationCells).toEqual([{ i: 0, j: 0 }]);
    expect(applied.cells.length).toBeGreaterThan(applied.variationCells.length);
  });

  it("mergeAutoExcludedAlignCells combines edge and variation exclusions", () => {
    const frame = {
      width: 4,
      height: 4,
      pixels: new Uint8Array(16),
      contrastDomain: { min: 0, max: 255 },
    };
    const grid = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      cellWidth: 2,
      cellHeight: 2,
      spacingA: 2,
      spacingB: 2,
    });
    const merged = mergeAutoExcludedAlignCells(
      [{ i: 9, j: 9 }],
      frame,
      grid,
      {
        threshold: 5,
        eligibleCellCount: 1,
        cellScores: [{ i: 0, j: 0, score: 1 }],
      },
      5,
    );
    expect(merged).toEqual(
      expect.arrayContaining([
        { i: 9, j: 9 },
        { i: 0, j: 0 },
      ]),
    );
    expect(merged.length).toBeGreaterThan(1);
  });

  it("deriveVisibleCounts returns zeros without frame", () => {
    expect(
      deriveVisibleCounts(null, normalizeAlignGridState(createDefaultAlignGrid()), []),
    ).toEqual({ included: 0, excluded: 0 });
  });
});
