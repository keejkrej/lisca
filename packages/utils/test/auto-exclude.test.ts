import { describe, expect, it } from "vitest";

import { computeAutoExcludePreview, maxEntropyThresholdOnHistogram } from "../src/auto-exclude";

describe("maxEntropyThresholdOnHistogram", () => {
  it("splits a bimodal histogram at the bin edge between the modes", () => {
    const counts = [25, 25, 25, 25];
    const edges = [0, 10, 20, 30, 40];
    const threshold = maxEntropyThresholdOnHistogram(counts, edges);
    // Kapur's argmax assigns bins [0,1] to the background class and bins [2,3]
    // to the foreground class; the threshold is the boundary edge between bin 1
    // and bin 2 (20), NOT the center of bin 1 (15). Returning a bin center would
    // exclude only the lower half of the boundary background bin.
    expect(threshold).toBe(20);
    expect(threshold).toBeGreaterThanOrEqual(10);
    expect(threshold).toBeLessThanOrEqual(30);
  });
});

describe("computeAutoExcludePreview", () => {
  it("scores uniform cells lower than high-contrast cells", () => {
    const width = 20;
    const height = 20;
    const pixels = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        pixels[y * width + x] = 100;
      }
    }
    for (let y = 2; y < 8; y += 1) {
      for (let x = 12; x < 18; x += 1) {
        pixels[y * width + x] = 220;
      }
    }

    const preview = computeAutoExcludePreview({ width, height, pixels }, [
      { i: 0, j: 0, x: 0, y: 0, w: 10, h: 10 },
      { i: 1, j: 0, x: 10, y: 0, w: 10, h: 10 },
    ]);

    expect(preview.eligibleCellCount).toBe(2);
    expect(preview.cellScores[0]?.score).toBeLessThan(preview.cellScores[1]?.score ?? 0);
    expect(preview.threshold).toBeGreaterThan(preview.scoreMin);
  });

  it("skips empty clipped cells", () => {
    const preview = computeAutoExcludePreview({ width: 8, height: 8, pixels: new Uint8Array(64) }, [
      { i: 0, j: 0, x: 10, y: 10, w: 4, h: 4 },
    ]);
    expect(preview.eligibleCellCount).toBe(0);
    expect(preview.cellScores).toEqual([]);
  });
});
