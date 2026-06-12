import { describe, expect, it } from "vitest";

import { applyBinaryMask } from "./mask";

describe("applyBinaryMask", () => {
  it("writes label values where the binary mask is set", () => {
    const mask = new Uint8Array([0, 1, 2, 0]);
    const binary = new Uint8Array([1, 0, 1, 1]);
    expect(applyBinaryMask(mask, binary, 3)).toEqual(new Uint8Array([3, 1, 3, 3]));
  });
});
