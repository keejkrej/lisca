import { describe, expect, test } from "vite-plus/test";

import type { StudioAssaySamples } from "@lisca/contracts/assay";
import {
  analysisChannelsFromSamples,
  collectAssayPositions,
  expandPositionRange,
  filterScanPositionsForAssay,
  formatSamplePositions,
  isValidSamplePositionRange,
  parseSamplePositions,
  parseSignalChannels,
  samplePositionFromDisplay,
  samplePositionToDisplay,
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

  test("parses signal channel lists", () => {
    expect(parseSignalChannels("1")).toEqual([1]);
    expect(parseSignalChannels("1,2")).toEqual([1, 2]);
    expect(parseSignalChannels("")).toBeNull();
    expect(parseSignalChannels("1,x")).toBeNull();
  });

  test("serializes sample identity only; channels go to analysis", () => {
    expect(
      sampleRowToDisk({
        name: "  sample ",
        positionStart: "2",
        positionFinish: "4",
      }),
    ).toEqual({
      name: "sample",
      positions: "2:4",
    });
  });

  test("loads UI rows from disk positions and analysis channels", () => {
    expect(
      sampleRowFromDisk(
        {
          name: "sample",
          positions: "9:20",
        },
        {
          channels: { segmentation: 0, signal: [1] },
          sampleChannels: [
            { sample: "other", segmentation: 5, signal: [6] },
            { sample: "sample", segmentation: 2, signal: [3, 4] },
          ],
        },
      ),
    ).toEqual({
      name: "sample",
      positionStart: "9",
      positionFinish: "20",
      segmentation: "2",
      signal: "3,4",
    });
  });

  test("loads UI rows without an override from the analysis defaults", () => {
    expect(
      sampleRowFromDisk(
        { name: "plain", positions: "1" },
        {
          channels: { segmentation: 0, signal: [1] },
          sampleChannels: [{ sample: "other", segmentation: 2, signal: [3] }],
        },
      ),
    ).toMatchObject({ name: "plain", segmentation: "0", signal: "1" });
  });

  test("derives analysis channel defaults and per-sample overrides keyed by name", () => {
    expect(
      analysisChannelsFromSamples([
        { name: "a", segmentation: "0", signal: "1" },
        { name: " b ", segmentation: "0", signal: "1,2" },
        { name: "c", segmentation: "3", signal: "1" },
        { name: "d", segmentation: "0", signal: "1" },
        { name: "  ", segmentation: "4", signal: "5" },
      ]),
    ).toEqual({
      channels: { segmentation: 0, signal: [1] },
      sampleChannels: [
        { sample: "b", segmentation: 0, signal: [1, 2] },
        { sample: "c", segmentation: 3, signal: [1] },
      ],
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
          name: "a",
          positionStart: "0",
          positionFinish: "3",
          segmentation: "0",
          signal: "1",
        },
        {
          id: "sample:1",
          name: "b",
          positionStart: "2",
          positionFinish: "5",
          segmentation: "0",
          signal: "1",
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

  test("editor shows positions 1-based and stores them 0-based", () => {
    expect(samplePositionToDisplay("0")).toBe("1");
    expect(samplePositionToDisplay("66")).toBe("67");
    expect(samplePositionToDisplay("")).toBe("");
    expect(samplePositionFromDisplay("1")).toBe("0");
    expect(samplePositionFromDisplay(" 67 ")).toBe("66");
    expect(samplePositionFromDisplay("")).toBe("");
    expect(samplePositionFromDisplay("0")).toBe(null);
    expect(samplePositionFromDisplay("-1")).toBe(null);
    expect(samplePositionFromDisplay("abc")).toBe(null);
  });
});
