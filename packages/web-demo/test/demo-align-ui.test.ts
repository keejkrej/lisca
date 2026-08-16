import { describe, expect, it } from "vitest";

import {
  createInitialDemoAlignUiState,
  mergeDemoAlignSession,
  normalizePersistedAlignToolMode,
  selectDemoAlignSession,
} from "../src/atoms/demo-align-ui";

describe("persisted align tool migration", () => {
  it("migrates the retired zoom mode to Magnifier", () => {
    const current = createInitialDemoAlignUiState();
    const session = {
      ...selectDemoAlignSession(current),
      toolMode: "zoom",
    } as unknown as Parameters<typeof mergeDemoAlignSession>[0];

    expect(mergeDemoAlignSession(session, current).toolMode).toBe("magnifier");
  });

  it("falls back to Pan for an unknown persisted mode", () => {
    expect(normalizePersistedAlignToolMode("future-tool")).toBe("pan");
    expect(normalizePersistedAlignToolMode(null)).toBe("pan");
  });
});
