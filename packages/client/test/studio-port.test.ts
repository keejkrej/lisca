import { describe, expect, it } from "vitest";

import { createStudioPort } from "../src/ports/studio";

describe("createStudioPort", () => {
  it("exposes annotate label and annotation CRUD methods", () => {
    const port = createStudioPort({
      baseUrl: () => "http://127.0.0.1:8767",
      isDev: false,
    });

    expect(typeof port.loadLabels).toBe("function");
    expect(typeof port.saveLabels).toBe("function");
    expect(typeof port.loadRoiFrameAnnotation).toBe("function");
    expect(typeof port.saveRoiFrameAnnotation).toBe("function");
    expect(typeof port.scanRoiWorkspace).toBe("function");
    expect(typeof port.loadRoiFrame).toBe("function");
  });
});
