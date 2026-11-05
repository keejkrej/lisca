import { describe, expect, it } from "vite-plus/test";

import { createAlignerPort } from "../src/ports/aligner";

describe("createAlignerPort", () => {
  it("exposes detectGrid as the Auto-detect backend", () => {
    const port = createAlignerPort({});
    expect(typeof port.detectGrid).toBe("function");
    expect(typeof port.saveBbox).toBe("function");
  });
});
