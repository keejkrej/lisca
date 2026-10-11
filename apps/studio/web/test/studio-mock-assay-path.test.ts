import { describe, expect, it } from "vite-plus/test";

import { studioMockAssayPath } from "../src/api/studio-mock";

describe("studioMockAssayPath", () => {
  it("returns null unless mock mode names an assay", () => {
    expect(studioMockAssayPath({})).toBeNull();
    expect(studioMockAssayPath({ VITE_LISCA_MOCK: "1" })).toBeNull();
    expect(studioMockAssayPath({ VITE_LISCA_MOCK: "1", VITE_LISCA_MOCK_ASSAY: "  " })).toBeNull();
    expect(studioMockAssayPath({ VITE_LISCA_MOCK_ASSAY: "/ws/assay.json" })).toBeNull();
  });

  it("returns the trimmed assay path in mock mode", () => {
    expect(
      studioMockAssayPath({ VITE_LISCA_MOCK: "1", VITE_LISCA_MOCK_ASSAY: " /ws/assay.json " }),
    ).toBe("/ws/assay.json");
  });
});
