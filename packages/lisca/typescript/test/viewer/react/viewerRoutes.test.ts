import { describe, expect, test } from "bun:test";

import {
  LAST_VIEWER_MODE_KEY,
  parseViewerMode,
  readStoredViewerMode,
  viewerIndexRedirectPath,
  viewerModeToPath,
  viewerPathToMode,
} from "../../../src/viewer/react";

function storage(value: string | null): Pick<Storage, "getItem"> {
  return {
    getItem: (key: string) => (key === LAST_VIEWER_MODE_KEY ? value : null),
  };
}

describe("viewer route helpers", () => {
  test("maps viewer modes to routes", () => {
    expect(viewerModeToPath("align")).toBe("/align");
    expect(viewerModeToPath("roi")).toBe("/roi");
    expect(viewerPathToMode("/align")).toBe("align");
    expect(viewerPathToMode("/roi")).toBe("roi");
  });

  test("falls back to align for invalid or missing stored mode", () => {
    expect(parseViewerMode("bad")).toBeNull();
    expect(readStoredViewerMode(storage("bad"))).toBeNull();
    expect(viewerIndexRedirectPath(storage("bad"))).toBe("/align");
    expect(viewerIndexRedirectPath(storage(null))).toBe("/align");
  });

  test("uses the last valid stored mode for the index redirect", () => {
    expect(viewerIndexRedirectPath(storage("roi"))).toBe("/roi");
  });
});
