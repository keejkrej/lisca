import type { VariationExcludePreviewResponse } from "@lisca/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  clampVariationThreshold,
  countVariationExcludedPatterns,
  deriveVariationExcludeMetrics,
  deriveVariationExcludePreview,
  formatVariationScore,
  isVariationBinActive,
  nextVariationExcludeThreshold,
} from "../src/variation-exclude-preview";

const preview: VariationExcludePreviewResponse = {
  eligiblePatternCount: 4,
  patternScores: [
    { i: 0, j: 0, score: 0.1 },
    { i: 0, j: 1, score: 0.5 },
    { i: 1, j: 0, score: 0.9 },
    { i: 1, j: 1, score: 1.2 },
  ],
  histogramBins: [
    { start: 0, end: 0.5, count: 2 },
    { start: 0.5, end: 1, count: 1 },
    { start: 1, end: 1.5, count: 1 },
  ],
  scoreMin: 0.1,
  scoreMax: 1.2,
  threshold: 0.5,
};

describe("variation exclude preview", () => {
  it("formats scores with fixed precision", () => {
    expect(formatVariationScore(0.123456)).toBe("0.123");
    expect(formatVariationScore(Number.NaN)).toBe("0.000");
  });

  it("clamps threshold to score range", () => {
    expect(clampVariationThreshold(2, 0.1, 1.2)).toBe(1.2);
    expect(clampVariationThreshold(-1, 0.1, 1.2)).toBe(0.1);
  });

  it("derives slider metrics and histogram scale", () => {
    const metrics = deriveVariationExcludeMetrics(preview);
    expect(metrics.min).toBe(0.1);
    expect(metrics.max).toBe(1.2);
    expect(metrics.maxBinCount).toBe(2);
  });

  it("counts selected patterns at or below threshold", () => {
    expect(countVariationExcludedPatterns(preview, 0.5)).toBe(2);
    expect(countVariationExcludedPatterns(preview, 1.5)).toBe(4);
  });

  it("marks histogram bins active through threshold", () => {
    expect(isVariationBinActive(0.5, 0.6)).toBe(true);
    expect(isVariationBinActive(1, 0.6)).toBe(false);
  });

  it("derives preview state with clamped threshold", () => {
    const derived = deriveVariationExcludePreview({ preview, threshold: 2 });
    expect(derived?.threshold).toBe(1.2);
    expect(derived?.selectedCount).toBe(4);
  });

  it("returns next threshold clamped to range", () => {
    expect(nextVariationExcludeThreshold({ preview, threshold: 0.5 }, 0.8)).toBe(0.8);
    expect(nextVariationExcludeThreshold({ preview, threshold: 0.5 }, 99)).toBe(1.2);
    expect(nextVariationExcludeThreshold(null, 0.5)).toBeNull();
  });
});
