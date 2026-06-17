import { describe, expect, it } from "vitest";

import {
  findSmartSegmentPromptIndexAt,
  smartSegmentPromptFrameRadius,
} from "@lisca/utils";

describe("smart prompt hit test", () => {
  it("finds the nearest prompt within a frame-scaled radius", () => {
    const prompts = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ];
    const radius = smartSegmentPromptFrameRadius(512, 512);
    expect(findSmartSegmentPromptIndexAt(prompts, 12, 11, radius)).toBe(0);
    expect(findSmartSegmentPromptIndexAt(prompts, 48, 52, radius)).toBe(1);
    expect(findSmartSegmentPromptIndexAt(prompts, 0, 0, radius)).toBe(-1);
  });

  it("uses a smaller hit radius on tiny frames", () => {
    const radius = smartSegmentPromptFrameRadius(60, 60);
    expect(radius).toBeLessThan(12);
  });
});
