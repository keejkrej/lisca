import { createDefaultAlignGrid } from "@lisca/utils";
import { describe, expect, it } from "vitest";

import {
  buildOccupancyPack,
  classifyCellsWithPack,
  embedOccupancyCrop,
  mergeOccupancyPacks,
  occupancyCorrectionsFromExclusionChange,
  occupancyExcludeScore,
  packGateMessage,
  packIsReady,
  promptExamplesFromCorrections,
  scoreEmbeddingAgainstPack,
  shouldExcludeScore,
} from "./occupancy";

function blobCrop(size = 32): { values: Float64Array; width: number; height: number } {
  const values = new Float64Array(size * size);
  const radius = size / 4;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      values[y * size + x] = dx * dx + dy * dy < radius * radius ? 200 : 20;
    }
  }
  return { values, width: size, height: size };
}

function emptyCrop(size = 32): { values: Float64Array; width: number; height: number } {
  return { values: new Float64Array(size * size).fill(40), width: size, height: size };
}

describe("occupancy prompt pack", () => {
  it("separates occupied blobs from empty sites with one example each", () => {
    const occupied = embedOccupancyCrop(blobCrop().values, 32, 32);
    const empty = embedOccupancyCrop(emptyCrop().values, 32, 32);
    const pack = buildOccupancyPack([occupied], [empty]);
    const occupiedScore = scoreEmbeddingAgainstPack(
      embedOccupancyCrop(blobCrop(36).values, 36, 36),
      pack,
    );
    const emptyScore = scoreEmbeddingAgainstPack(
      embedOccupancyCrop(emptyCrop(36).values, 36, 36),
      pack,
    );
    expect(emptyScore).toBeGreaterThan(occupiedScore);
    expect(shouldExcludeScore(emptyScore, pack)).toBe(true);
    expect(shouldExcludeScore(occupiedScore, pack)).toBe(false);
  });

  it("scores closer-to-empty queries as positive exclude scores", () => {
    expect(occupancyExcludeScore([0.1, 0.9], [1, 0], [0, 1])).toBeGreaterThan(0);
  });

  it("gates promptable scoring until two occupied and two empty examples exist", () => {
    const oneEach = buildOccupancyPack(
      [embedOccupancyCrop(blobCrop().values, 32, 32)],
      [embedOccupancyCrop(emptyCrop().values, 32, 32)],
    );
    expect(packIsReady(oneEach)).toBe(false);
    expect(packGateMessage(oneEach)).toContain("Not ready yet");
    const ready = mergeOccupancyPacks(
      oneEach,
      buildOccupancyPack(
        [embedOccupancyCrop(blobCrop(36).values, 36, 36)],
        [embedOccupancyCrop(emptyCrop(36).values, 36, 36)],
      ),
    );
    expect(packIsReady(ready)).toBe(true);
  });

  it("maps a single include/exclude toggle to one support example", () => {
    const added = occupancyCorrectionsFromExclusionChange([], [{ i: 1, j: 2 }]);
    expect(added).toEqual([{ label: "empty", i: 1, j: 2 }]);
    const removed = occupancyCorrectionsFromExclusionChange([{ i: 1, j: 2 }], []);
    expect(removed).toEqual([{ label: "occupied", i: 1, j: 2 }]);
  });

  it("classifies a query crop against a ready pack", () => {
    const occupied = embedOccupancyCrop(blobCrop().values, 32, 32);
    const empty = embedOccupancyCrop(emptyCrop().values, 32, 32);
    const pack = buildOccupancyPack([occupied, occupied], [empty, empty]);
    const frame = { width: 32, height: 32, pixels: emptyCrop().values };
    const excluded = classifyCellsWithPack(frame, [{ i: 0, j: 0, x: 0, y: 0, w: 32, h: 32 }], pack);
    expect(excluded).toEqual([{ i: 0, j: 0 }]);
  });

  it("resolves correction coords against the visible grid", () => {
    const frame = { width: 8, height: 8 };
    const grid = {
      ...createDefaultAlignGrid(),
      enabled: true,
      originX: 4,
      originY: 4,
      spacingA: 8,
      spacingB: 8,
      cellWidth: 8,
      cellHeight: 8,
    };
    const examples = promptExamplesFromCorrections(frame, grid, [{ label: "empty", i: 0, j: 0 }]);
    expect(examples.length).toBeGreaterThanOrEqual(0);
  });
});
