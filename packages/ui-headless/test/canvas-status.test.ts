import { describe, expect, it } from "vitest";

import { canvasToastPresentation } from "../src/canvas-status";

describe("canvas-status", () => {
  it("classifies toast presentation", () => {
    expect(canvasToastPresentation({ text: "Failed", tone: "error" })).toBe("error");
    expect(canvasToastPresentation({ text: "Loading frame" })).toBe("text");
    expect(canvasToastPresentation({ text: "Done", tone: "success" })).toBe("text");
  });
});
