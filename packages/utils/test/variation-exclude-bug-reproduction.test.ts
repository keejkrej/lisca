import { describe, expect, it } from "vite-plus/test";

import type { AlignGridPatternBox } from "@lisca/contracts";

import {
  computeVariationExcludePreview,
  maxEntropyThresholdOnHistogram,
} from "../src/variation-exclude";
import type { FrameResult } from "../src/frame";

/**
 * Regression coverage for the Kapur threshold bin-edge fix, plus the log-std
 * foreground-fraction score: empty patterns stay at 0 and a cell-sized block
 * outscores a one-pixel speck.
 */

const CELL = 16;
const GAP = 8;

function paintBlock(
  pixels: Uint8Array,
  width: number,
  x: number,
  y: number,
  size: number,
  value: number,
) {
  for (let row = y; row < y + size; row += 1) {
    for (let col = x; col < x + size; col += 1) pixels[row * width + col] = value;
  }
}

function buildFixtureFrame(): { frame: FrameResult; patterns: AlignGridPatternBox[] } {
  const width = CELL * 3 + GAP * 2;
  const height = CELL;
  const pixels = new Uint8Array(width * height).fill(30);
  const cellX = CELL + GAP;
  const speckX = cellX + CELL + GAP;
  paintBlock(pixels, width, cellX + 4, 4, 8, 220);
  pixels[4 * width + (speckX + 8)] = 255;
  return {
    frame: { width, height, pixels },
    patterns: [
      { i: 0, j: 0, x: 0, y: 0, w: CELL, h: CELL },
      { i: 1, j: 0, x: cellX, y: 0, w: CELL, h: CELL },
      { i: 2, j: 0, x: speckX, y: 0, w: CELL, h: CELL },
    ],
  };
}

describe("maxEntropyThresholdOnHistogram", () => {
  it("retains the first argmax split (strict >) and returns its bin edge", () => {
    // Symmetric bimodal histogram: split=1 and split=3 tie on entropy. Strict `>`
    // retains the first (split=1), so the threshold is edges[2] = 20, not 40.
    const counts = [10, 10, 0, 10, 10];
    const edges = [0, 10, 20, 30, 40, 50];
    expect(maxEntropyThresholdOnHistogram(counts, edges)).toBe(20);
  });
});

describe("computeVariationExcludePreview log-std foreground fraction", () => {
  const { frame, patterns } = buildFixtureFrame();

  it("ranks an empty pattern below a speck and a speck below a cell-sized block", () => {
    const preview = computeVariationExcludePreview(frame, patterns);
    const byColumn = new Map(preview.patternScores.map((pattern) => [pattern.i, pattern.score]));
    const empty = byColumn.get(0) ?? 1;
    const cell = byColumn.get(1) ?? 0;
    const speck = byColumn.get(2) ?? 1;
    expect(empty).toBe(0);
    expect(speck).toBeGreaterThan(empty);
    expect(speck).toBeLessThan(cell);
    expect(cell).toBeGreaterThan(0.2);
    expect(cell).toBeLessThanOrEqual(1);
  });

  it("excludes the empty pattern and keeps the cell under score <= threshold", () => {
    const preview = computeVariationExcludePreview(frame, patterns);
    const byColumn = new Map(preview.patternScores.map((pattern) => [pattern.i, pattern.score]));
    expect((byColumn.get(0) ?? 1) <= preview.threshold).toBe(true);
    expect((byColumn.get(1) ?? 0) <= preview.threshold).toBe(false);
  });
});
