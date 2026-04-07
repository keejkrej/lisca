import { describe, expect, test } from "bun:test";

import { ViewerCanvasSurface } from "../../../src/viewer/react";

describe("react package alignment surface", () => {
  test("exports the canvas surface", () => {
    expect(typeof ViewerCanvasSurface).toBe("function");
  });
});
