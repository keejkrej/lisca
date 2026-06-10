import { describe, expect, it } from "vitest";

import { cursorForAlignTool } from "../src/align-canvas-handlers";

describe("cursorForAlignTool", () => {
  it("returns default when grid is disabled", () => {
    expect(cursorForAlignTool("pan", false, false)).toBe("default");
  });

  it("returns grabbing while dragging", () => {
    expect(cursorForAlignTool("pan", true, true)).toBe("grabbing");
  });

  it("maps tool modes", () => {
    expect(cursorForAlignTool("pan", true, false)).toBe("grab");
    expect(cursorForAlignTool("rotate", true, false)).toBe("crosshair");
    expect(cursorForAlignTool("zoom-vector", true, false)).toBe("zoom-in");
  });
});
