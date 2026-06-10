import { describe, expect, test } from "vitest";

import type { StudioBasicInfoStep3 } from "@lisca/contracts/assay";
import {
  collectAssayPositions,
  expandPositionRange,
  filterScanPositionsForAssay,
  formatSamplePositions,
  isValidSamplePositionRange,
  parseLegacySamplePositions,
  sampleRowFromDisk,
  sampleRowToDisk,
} from "../src/utils/sample-positions";

describe("sample positions", () => {
  test("formats single position and inclusive ranges", () => {
    expect(formatSamplePositions("3", "3")).toBe("3");
    expect(formatSamplePositions("1", "12")).toBe("1:12");
    expect(formatSamplePositions("12", "1")).toBe("1:12");
  });

  test("parses legacy positions strings into start and finish", () => {
    expect(parseLegacySamplePositions("1:12")).toEqual({
      positionStart: "1",
      positionFinish: "12",
    });
    expect(parseLegacySamplePositions("5")).toEqual({
      positionStart: "5",
      positionFinish: "5",
    });
    expect(parseLegacySamplePositions("1,3,5")).toEqual({
      positionStart: "1",
      positionFinish: "5",
    });
  });

  test("validates 1-based position ranges", () => {
    expect(isValidSamplePositionRange("1", "12")).toBe(true);
    expect(isValidSamplePositionRange("0", "12")).toBe(false);
    expect(isValidSamplePositionRange("12", "1")).toBe(false);
    expect(isValidSamplePositionRange("", "12")).toBe(false);
  });

  test("adds positions only when serializing to disk", () => {
    expect(
      sampleRowToDisk({
        id: "slide-i:0",
        channel: "0",
        name: "sample",
        positionStart: "2",
        positionFinish: "4",
        maskChannel: "0",
        signalChannel: "1",
      }),
    ).toEqual({
      channel: "0",
      name: "sample",
      positionStart: "2",
      positionFinish: "4",
      maskChannel: "0",
      signalChannel: "1",
      positions: "2:4",
    });
  });

  test("loads UI rows without keeping legacy positions in state", () => {
    expect(
      sampleRowFromDisk({
        channel: "0",
        name: "sample",
        positions: "9:20",
        maskChannel: "0",
        signalChannel: "1",
      }),
    ).toEqual({
      channel: "0",
      name: "sample",
      positionStart: "9",
      positionFinish: "20",
      maskChannel: "0",
      signalChannel: "1",
    });
  });

  test("expands inclusive position ranges", () => {
    expect(expandPositionRange("3", "3")).toEqual([3]);
    expect(expandPositionRange("1", "4")).toEqual([1, 2, 3, 4]);
    expect(expandPositionRange("", "4")).toEqual([]);
    expect(expandPositionRange("4", "1")).toEqual([]);
  });

  test("collects union of assay sample rows on the selected slide", () => {
    const info3: StudioBasicInfoStep3 = {
      selectedSlideId: "slide-vi",
      samplesBySlide: {
        "slide-i": [
          {
            id: "slide-i:0",
            channel: "0",
            name: "a",
            positionStart: "99",
            positionFinish: "99",
            maskChannel: "0",
            signalChannel: "1",
          },
        ],
        "slide-vi": [
          {
            id: "slide-vi:0",
            channel: "0",
            name: "a",
            positionStart: "1",
            positionFinish: "4",
            maskChannel: "0",
            signalChannel: "1",
          },
          {
            id: "slide-vi:1",
            channel: "1",
            name: "b",
            positionStart: "3",
            positionFinish: "6",
            maskChannel: "0",
            signalChannel: "1",
          },
        ],
      },
    };
    expect(collectAssayPositions(info3)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("filters scan positions to assay positions in scan order", () => {
    expect(filterScanPositionsForAssay([1, 2, 3, 4, 5], [2, 4])).toEqual([2, 4]);
    expect(filterScanPositionsForAssay([10, 11, 12], [1, 2, 3])).toEqual([]);
    expect(filterScanPositionsForAssay([1, 2, 3], [])).toEqual([]);
  });
});
