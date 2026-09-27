import { describe, expect, it } from "vite-plus/test";

import { isSamModelCached, SAM_MODEL_ID } from "./sam-model-cache";

describe("isSamModelCached", () => {
  it("returns false when Cache API is unavailable", async () => {
    await expect(isSamModelCached(SAM_MODEL_ID)).resolves.toBe(false);
  });
});
