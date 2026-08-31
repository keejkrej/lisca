import { describe, expect, test } from "vitest";

import { buildBboxCsv, normalizeAlignGridState } from "../src";

describe("buildBboxCsv", () => {
  test("writes live bbox columns without grid i,j", () => {
    const csv = buildBboxCsv(
      { width: 20, height: 20, pixels: new Uint8Array(400) },
      normalizeAlignGridState({
        enabled: true,
        spacingA: 10,
        spacingB: 10,
        cellWidth: 8,
        cellHeight: 8,
      }),
      [],
    );
    const [header, ...rows] = csv.split("\n");
    expect(header).toBe("roi,x,y,w,h");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.split(",")).toHaveLength(5);
  });
});
