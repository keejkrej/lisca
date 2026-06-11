import { describe, expect, it } from "vitest";
import UTIF from "utif";

import { encodeGray16Tiff } from "../src/browser/encode-gray16-tiff";
import { cropFrameRegion } from "@lisca/utils";

function decodeUtifGray16(bytes: Uint8Array): Uint16Array {
  const ifds = UTIF.decode(bytes.buffer);
  UTIF.decodeImage(bytes.buffer, ifds[0]!);
  const first = ifds[0]!;
  const pixelCount = first.width! * first.height!;
  const data = first.data;
  if (!(data instanceof Uint8Array) || data.length !== pixelCount * 2) {
    throw new Error("expected packed 16-bit gray data");
  }
  const pixels = new Uint16Array(pixelCount);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let index = 0; index < pixelCount; index += 1) {
    pixels[index] = view.getUint16(index * 2, false);
  }
  return pixels;
}

describe("gray16 tiff demo export", () => {
  it("round-trips uint16 pixels through encode and UTIF decode", () => {
    const width = 4;
    const height = 3;
    const source = new Uint16Array([
      100, 200, 300, 400, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000,
    ]);
    const encoded = encodeGray16Tiff(width, height, source);
    expect(Array.from(decodeUtifGray16(encoded))).toEqual(Array.from(source));
  });

  it("preserves cropped roi values from a loaded 16-bit frame", () => {
    const width = 4;
    const height = 3;
    const source = new Uint16Array([
      100, 200, 300, 400, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000,
    ]);
    const frame = {
      width,
      height,
      pixels: decodeUtifGray16(encodeGray16Tiff(width, height, source)),
    };
    const cropped = cropFrameRegion(frame, { x: 1, y: 1, w: 2, h: 2 });
    expect(Array.from(cropped)).toEqual([2000, 3000, 6000, 7000]);
    expect(Array.from(decodeUtifGray16(encodeGray16Tiff(2, 2, cropped)))).toEqual([
      2000, 3000, 6000, 7000,
    ]);
  });
});
