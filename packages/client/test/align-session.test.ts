import { createDefaultAlignGrid, normalizeAlignGridState } from "@lisca/utils";
import { describe, expect, it } from "vite-plus/test";

import {
  alignSnapshotKey,
  allAlignPositionsSaved,
  applyDockVariationExcludeWithEdge,
  applyVariationExcludeWithEdge,
  patternsBelowVariationThreshold,
  cropPositionsAfterSkip,
  deriveVisibleCounts,
  mergeAlignGridEdgeExclusion,
  mergeEdgeAndVariationExcludedPatterns,
  nextAlignPosition,
  nextUnsavedAlignPosition,
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

  it("patternsBelowVariationThreshold maps scores to pattern coords", () => {
    const patterns = patternsBelowVariationThreshold(
      {
        threshold: 5,
        eligiblePatternCount: 2,
        patternScores: [
          { i: 0, j: 0, score: 1 },
          { i: 1, j: 1, score: 9 },
        ],
        histogramBins: [],
        scoreMin: 1,
        scoreMax: 9,
      },
      5,
    );
    expect(patterns).toEqual([{ i: 0, j: 0 }]);
  });

  it("updateVariationExcludeThreshold preserves preview while changing threshold", () => {
    const preview = {
      preview: {
        threshold: 5,
        eligiblePatternCount: 1,
        patternScores: [{ i: 0, j: 0, score: 1 }],
        histogramBins: [],
        scoreMin: 1,
        scoreMax: 1,
      },
      threshold: 5,
    };
    expect(updateVariationExcludeThreshold(preview, 3)).toEqual({
      ...preview,
      threshold: 3,
    });
    expect(updateVariationExcludeThreshold(null, 3)).toBeNull();
  });

  it("mergeAlignGridEdgeExclusion adds visible edge patterns", () => {
    const frame = {
      width: 4,
      height: 4,
      pixels: new Uint8Array(16),
      contrastDomain: { min: 0, max: 255 },
    };
    const grid = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      patternWidth: 2,
      patternHeight: 2,
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
      patternWidth: 2,
      patternHeight: 2,
      spacingA: 2,
      spacingB: 2,
    });
    const preview = {
      preview: {
        threshold: 5,
        eligiblePatternCount: 1,
        patternScores: [{ i: 0, j: 0, score: 1 }],
        histogramBins: [],
        scoreMin: 1,
        scoreMax: 1,
      },
      threshold: 5,
    };
    const applied = applyDockVariationExcludeWithEdge(frame, grid, preview);
    expect(applied.patterns).not.toEqual(expect.arrayContaining([{ i: 2, j: 2 }]));
    expect(applied.variationPatterns).toEqual([{ i: 0, j: 0 }]);
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
      patternWidth: 2,
      patternHeight: 2,
      spacingA: 2,
      spacingB: 2,
    });
    const preview = {
      preview: {
        threshold: 5,
        eligiblePatternCount: 1,
        patternScores: [{ i: 0, j: 0, score: 1 }],
        histogramBins: [],
        scoreMin: 1,
        scoreMax: 1,
      },
      threshold: 5,
    };
    const applied = applyVariationExcludeWithEdge([], frame, grid, preview);
    expect(applied.variationPatterns).toEqual([{ i: 0, j: 0 }]);
    expect(applied.patterns.length).toBeGreaterThan(applied.variationPatterns.length);
  });

  it("mergeEdgeAndVariationExcludedPatterns combines edge and variation exclusions", () => {
    const frame = {
      width: 4,
      height: 4,
      pixels: new Uint8Array(16),
      contrastDomain: { min: 0, max: 255 },
    };
    const grid = normalizeAlignGridState({
      ...createDefaultAlignGrid(),
      enabled: true,
      patternWidth: 2,
      patternHeight: 2,
      spacingA: 2,
      spacingB: 2,
    });
    const merged = mergeEdgeAndVariationExcludedPatterns(
      [{ i: 9, j: 9 }],
      frame,
      grid,
      {
        threshold: 5,
        eligiblePatternCount: 1,
        patternScores: [{ i: 0, j: 0, score: 1 }],
        histogramBins: [],
        scoreMin: 1,
        scoreMax: 1,
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

describe("Studio Continue helpers", () => {
  const positions = [67, 78, 90, 102];

  it("nextUnsavedAlignPosition searches forward from the current position and wraps", () => {
    expect(nextUnsavedAlignPosition(positions, 78, new Set([67, 78]))).toBe(90);
    expect(nextUnsavedAlignPosition(positions, 102, new Set([90, 102]))).toBe(67);
    expect(nextUnsavedAlignPosition(positions, 90, new Set([67, 78, 102]))).toBe(90);
    expect(nextUnsavedAlignPosition(positions, 90, new Set(positions))).toBeNull();
  });

  it("alignSnapshotKey ignores exclusion order but tracks grid and pattern changes", () => {
    const grid = createDefaultAlignGrid();
    const patterns = [
      { i: 1, j: 2 },
      { i: 0, j: 5 },
    ];
    const a = alignSnapshotKey(grid, patterns, null);
    const b = alignSnapshotKey(
      grid,
      [
        { i: 0, j: 5 },
        { i: 1, j: 2 },
      ],
      null,
    );
    expect(a).toBe(b);
    expect(alignSnapshotKey(grid, [{ i: 0, j: 5 }], null)).not.toBe(a);
    expect(alignSnapshotKey({ ...grid, rotation: grid.rotation + 1 }, patterns, null)).not.toBe(a);
    const drift = {
      referenceTime: 0,
      interpolation: "linear" as const,
      keyframes: [{ time: 10, dx: 1, dy: 2 }],
    };
    expect(alignSnapshotKey(grid, patterns, drift)).not.toBe(a);
    expect(
      alignSnapshotKey(grid, patterns, {
        ...drift,
        keyframes: [{ time: 10, dx: 1, dy: 2 }],
      }),
    ).toBe(alignSnapshotKey(grid, patterns, drift));
  });
});
