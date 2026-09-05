import { describe, expect, it } from "vitest";

import type { AutoExcludePreviewCell } from "@lisca/contracts";

import { computeAutoExcludePreview, maxEntropyThresholdOnHistogram } from "../src/auto-exclude";
import type { FrameResult } from "../src/frame";

/**
 * Regression coverage for the Kapur threshold bin-edge fix.
 *
 * `maxEntropyThresholdOnHistogram` partitions bins into a background class
 * `probabilities.slice(0, split + 1)` (bin `split` included) and a foreground
 * class, then returns the bin EDGE between the last background bin and the
 * first foreground bin so that consumers filtering `score <= threshold` exclude
 * exactly the background bins. The bin-center return that preceded this code
 * sat half a bin too low and kept the upper-half cells of the boundary bin.
 */

// 8x8 cell = 64 px; one non-zero pixel of value v gives bandLength=ceil(64*0.1)=7,
// highMean = v/7, lowMean = 0; score = (v/7) / max(0, 1.0) = v/7.
const COLS = 5;
const ROWS = 4;
const CELL_W = 8;
const CELL_H = 8;
const CONTENT_VALUE = 255;
// Faint values chosen so four empty-cell scores (v=7,9,11,13) land in bin
// [1.0, 2.0); the upper two (11/7, 13/7) are in that bin's upper half and were
// wrongly kept under the old bin-center threshold (1.5).
const EMPTY_FAINT_VALUES = [1, 2, 3, 4, 5, 6, 7, 9, 11, 13];
const EMPTY_SCORES = EMPTY_FAINT_VALUES.map((v) => v / 7);

function buildFixtureFrame(): { frame: FrameResult; cells: AutoExcludePreviewCell[] } {
  const width = COLS * CELL_W; // 40
  const height = ROWS * CELL_H; // 32
  const pixels = new Uint8Array(width * height);
  const cells: AutoExcludePreviewCell[] = [];
  let idx = 0;
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) {
      const x = i * CELL_W;
      const y = j * CELL_H;
      // One non-zero pixel at the cell's top-left corner; the rest stay 0.
      pixels[y * width + x] =
        idx < EMPTY_FAINT_VALUES.length ? EMPTY_FAINT_VALUES[idx] : CONTENT_VALUE;
      cells.push({ i, j, x, y, w: CELL_W, h: CELL_H });
      idx += 1;
    }
  }
  return { frame: { width, height, pixels }, cells };
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

describe("computeAutoExcludePreview (bin-edge fix on a constructed half-bin case)", () => {
  const { frame, cells } = buildFixtureFrame();

  it("returns the bin-edge threshold, not the bin center", () => {
    const preview = computeAutoExcludePreview(frame, cells);
    // Kapur's argmax puts bin [1.0, 2.0) in the background class, so the
    // threshold is the bin edge 2.0 — not the bin center 1.5 that kept the
    // upper-half empty cells. It must also separate the two score modes.
    expect(preview.threshold).toBe(2);
    expect(preview.threshold).toBeGreaterThan(preview.scoreMin);
    expect(preview.threshold).toBeLessThan(preview.scoreMax);
  });

  it("excludes all background-bin cells and keeps all foreground-bin cells under `score <= threshold`", () => {
    const preview = computeAutoExcludePreview(frame, cells);
    const emptyScoreSet = new Set(EMPTY_SCORES);
    let emptyKept = 0;
    let contentExcluded = 0;
    // The exact predicate used by cellsBelowVariationThreshold (align-session.ts).
    for (const cell of preview.cellScores) {
      const isEmpty = emptyScoreSet.has(cell.score);
      if (cell.score <= preview.threshold) {
        if (!isEmpty) contentExcluded += 1;
      } else if (isEmpty) {
        emptyKept += 1;
      }
    }
    expect(emptyKept).toBe(0);
    expect(contentExcluded).toBe(0);
  });
});
