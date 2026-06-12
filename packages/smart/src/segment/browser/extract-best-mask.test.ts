import { describe, expect, it } from "vitest";

import { extractBestMask } from "./extract-best-mask";

describe("extractBestMask", () => {
  it("selects the highest-scoring CHW mask plane", () => {
    const width = 2;
    const height = 2;
    const pixelCount = width * height;
    const data = new Uint8Array(pixelCount * 3);
    // mask 0: empty
    // mask 1: full
    for (let index = 0; index < pixelCount; index += 1) {
      data[pixelCount + index] = 1;
    }
    const mask = extractBestMask(
      { data, dims: [3, height, width] },
      [0.1, 0.9, 0.2],
      width,
      height,
    );
    expect(Array.from(mask)).toEqual([1, 1, 1, 1]);
  });

  it("reads batch-first NCHW tensors", () => {
    const width = 2;
    const height = 2;
    const pixelCount = width * height;
    const data = new Uint8Array(pixelCount * 3);
    for (let index = 0; index < pixelCount; index += 1) {
      data[2 * pixelCount + index] = 1;
    }
    const mask = extractBestMask(
      { data, dims: [1, 3, height, width] },
      [0.2, 0.3, 0.95],
      width,
      height,
    );
    expect(Array.from(mask)).toEqual([1, 1, 1, 1]);
  });
});
