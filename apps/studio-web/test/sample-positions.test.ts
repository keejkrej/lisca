import { describe, expect, test } from "vitest";

import {
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
});
