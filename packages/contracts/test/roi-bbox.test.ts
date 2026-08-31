import { describe, expect, it } from "vitest";

import { BBOX_CSV_COLUMNS } from "../src/schema/roi-bbox";

describe("bbox CSV contract", () => {
  it("requires roi, x, y, w, h and does not accept crop", () => {
    expect(BBOX_CSV_COLUMNS).toEqual(["roi", "x", "y", "w", "h"]);
    expect(BBOX_CSV_COLUMNS).not.toContain("crop");
  });
});
