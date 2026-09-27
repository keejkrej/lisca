import { describe, expect, it } from "vite-plus/test";

import {
  nextStudioAnnotateSite,
  previousStudioAnnotateSite,
} from "../src/state/studio-annotate-navigation";

const scan = {
  positions: [
    { pos: 2, channels: [0], times: [0], zSlices: [0], rois: [roi(4), roi(8)] },
    { pos: 3, channels: [0], times: [0], zSlices: [0], rois: [] },
    { pos: 7, channels: [0], times: [0], zSlices: [0], rois: [roi(1)] },
  ],
};

function roi(value: number) {
  return {
    roi: value,
    fileName: `roi-${value}.tif`,
    bbox: { roi: value, x: 0, y: 0, w: 10, h: 10 },
  };
}

describe("nextStudioAnnotateSite", () => {
  it("advances within the current position", () => {
    expect(nextStudioAnnotateSite(scan, { pos: 2, roi: 4 })).toEqual({ pos: 2, roi: 8 });
  });

  it("advances to the next non-empty position", () => {
    expect(nextStudioAnnotateSite(scan, { pos: 2, roi: 8 })).toEqual({ pos: 7, roi: 1 });
  });

  it("does not wrap after the final site", () => {
    expect(nextStudioAnnotateSite(scan, { pos: 7, roi: 1 })).toBeNull();
  });

  it("recovers an unknown selection at the first available site", () => {
    expect(nextStudioAnnotateSite(scan, { pos: 99, roi: 99 })).toEqual({ pos: 2, roi: 4 });
  });
});

describe("previousStudioAnnotateSite", () => {
  it("steps back within a position and across empty positions", () => {
    expect(previousStudioAnnotateSite(scan, { pos: 2, roi: 8 })).toEqual({ pos: 2, roi: 4 });
    expect(previousStudioAnnotateSite(scan, { pos: 7, roi: 1 })).toEqual({ pos: 2, roi: 8 });
  });

  it("does not wrap before the first site or guess for unknown selections", () => {
    expect(previousStudioAnnotateSite(scan, { pos: 2, roi: 4 })).toBeNull();
    expect(previousStudioAnnotateSite(scan, { pos: null, roi: null })).toBeNull();
  });
});
