import { describe, expect, it } from "vitest";

import {
  activeLabelValueForId,
  framePointFromViewport,
} from "../src/annotation-canvas-handlers";

describe("framePointFromViewport", () => {
  it("maps center of letterboxed viewport to frame center", () => {
    const point = framePointFromViewport(100, 50, 200, 100, 0, 0, 100, 100);
    expect(point).toEqual({ x: 50, y: 50 });
  });

  it("returns null outside drawn frame bounds", () => {
    expect(framePointFromViewport(5, 5, 200, 100, 0, 0, 100, 100)).toBeNull();
  });
});

describe("activeLabelValueForId", () => {
  it("returns 1-based label index", () => {
    expect(
      activeLabelValueForId(
        [
          { id: "a", name: "A", color: "#ff0000" },
          { id: "b", name: "B", color: "#00ff00" },
        ],
        "b",
      ),
    ).toBe(2);
  });

  it("returns 0 when label is missing", () => {
    expect(activeLabelValueForId([], "missing")).toBe(0);
  });
});
