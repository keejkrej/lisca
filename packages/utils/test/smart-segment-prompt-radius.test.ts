import { describe, expect, it } from "bun:test";

import {
  findSmartSegmentPromptIndexAt,
  smartSegmentPromptFrameRadius,
  smartSegmentPromptRadius,
} from "../src/annotate";

describe("smartSegmentPromptRadius", () => {
  it("keeps prompts small on tiny frames displayed large", () => {
    const radius = smartSegmentPromptRadius(60, 60, 5);
    expect(radius).toBeLessThanOrEqual(12);
    expect(radius).toBeGreaterThanOrEqual(2);
  });

  it("stays visible on large frames displayed small", () => {
    const radius = smartSegmentPromptRadius(2048, 2048, 0.15);
    expect(radius).toBeGreaterThanOrEqual(2);
  });
});

describe("smartSegmentPromptFrameRadius", () => {
  it("scales hit testing with frame size", () => {
    expect(smartSegmentPromptFrameRadius(60, 60)).toBeLessThan(
      smartSegmentPromptFrameRadius(512, 512),
    );
  });
});

describe("findSmartSegmentPromptIndexAt", () => {
  it("finds the nearest prompt within radius", () => {
    const prompts = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ];
    const radius = smartSegmentPromptFrameRadius(512, 512);
    expect(findSmartSegmentPromptIndexAt(prompts, 12, 11, radius)).toBe(0);
    expect(findSmartSegmentPromptIndexAt(prompts, 48, 52, radius)).toBe(1);
    expect(findSmartSegmentPromptIndexAt(prompts, 0, 0, radius)).toBe(-1);
  });
});
