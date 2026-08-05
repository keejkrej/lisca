import { describe, expect, test } from "vitest";

import type { StudioAssaySamples } from "@lisca/contracts/assay";
import {
  collectAssayPositions,
  expandPositionRange,
  filterScanPositionsForAssay,
  formatSamplePositions,
  isValidSamplePositionRange,
  parseSamplePositions,
  sampleRowFromDisk,
  sampleRowToDisk,
} from "../src/studio/sample-positions";

describe("sample positions", () => {
  test("formats single position and inclusive ranges", () => {
    expect(formatSamplePositions("3", "3")).toBe("3");
    expect(formatSamplePositions("1", "12")).toBe("1:12");
    expect(formatSamplePositions("12", "1")).toBe("1:12");
  });

  test("parses positions strings into start and finish", () => {
    expect(parseSamplePositions("1:12")).toEqual({
      positionStart: "1",
      positionFinish: "12",
    });
    expect(parseSamplePositions("5")).toEqual({
      positionStart: "5",
      positionFinish: "5",
    });
    expect(parseSamplePositions("1,3,5")).toEqual({
      positionStart: "1",
      positionFinish: "5",
    });
  });

  test("validates 0-based position ranges", () => {
    expect(isValidSamplePositionRange("0", "11")).toBe(true);
    expect(isValidSamplePositionRange("1", "12")).toBe(true);
    expect(isValidSamplePositionRange("12", "1")).toBe(false);
    expect(isValidSamplePositionRange("", "12")).toBe(false);
  });

  test("adds positions only when serializing to disk", () => {
    expect(
      sampleRowToDisk({
        slide: "0",
        name: "sample",
        positionStart: "2",
        positionFinish: "4",
        brightfield: "0",
        fluorescence: "1",
      }),
    ).toEqual({
      slide: "0",
      name: "sample",
      brightfield: "0",
      fluorescence: "1",
      positions: "2:4",
    });
  });

  test("loads UI rows from disk positions", () => {
    expect(
      sampleRowFromDisk({
        slide: "0",
        name: "sample",
        positions: "9:20",
        brightfield: "0",
        fluorescence: "1",
      }),
    ).toEqual({
      slide: "0",
      name: "sample",
      positionStart: "9",
      positionFinish: "20",
      brightfield: "0",
      fluorescence: "1",
    });
  });

  test("expands inclusive position ranges", () => {
    expect(expandPositionRange("0", "3")).toEqual([0, 1, 2, 3]);
    expect(expandPositionRange("3", "3")).toEqual([3]);
    expect(expandPositionRange("1", "4")).toEqual([1, 2, 3, 4]);
    expect(expandPositionRange("", "4")).toEqual([]);
    expect(expandPositionRange("4", "1")).toEqual([]);
  });

  test("collects union of assay sample positions", () => {
    const samples: StudioAssaySamples = {
      samples: [
        {
          id: "sample:0",
          slide: "0",
          name: "a",
          positionStart: "0",
          positionFinish: "3",
          brightfield: "0",
          fluorescence: "1",
        },
        {
          id: "sample:1",
          slide: "1",
          name: "b",
          positionStart: "2",
          positionFinish: "5",
          brightfield: "0",
          fluorescence: "1",
        },
      ],
    };
    expect(collectAssayPositions(samples)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("filters scan positions to assay positions in scan order", () => {
    expect(filterScanPositionsForAssay([0, 1, 2, 3, 4], [1, 3])).toEqual([1, 3]);
    expect(filterScanPositionsForAssay([10, 11, 12], [0, 1, 2])).toEqual([]);
    expect(filterScanPositionsForAssay([0, 1, 2], [])).toEqual([]);
  });
});
