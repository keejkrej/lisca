import { describe, expect, it } from "vitest";
import UTIF from "utif";

import { encodeGrayTiff } from "../src/browser/encode-gray-tiff";
import { roiImageExtension } from "../src/browser/source-image-format";
import { cropFrameRegion } from "@lisca/utils";

function tiffBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function decodeUtifGray16(bytes: Uint8Array): Uint16Array {
  const buffer = tiffBuffer(bytes);
  const ifds = UTIF.decode(buffer);
  UTIF.decodeImage(buffer, ifds[0]!);
  const first = ifds[0]!;
  const pixelCount = first.width! * first.height!;
  const data = first.data;
  if (!(data instanceof Uint8Array) || data.length !== pixelCount * 2) {
    throw new Error("expected packed 16-bit gray data");
  }
  const pixels = new Uint16Array(pixelCount);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let index = 0; index < pixelCount; index += 1) {
    pixels[index] = view.getUint16(index * 2, true);
  }
  return pixels;
}

function decodeUtifGray8(bytes: Uint8Array): Uint8Array {
  const buffer = tiffBuffer(bytes);
  const ifds = UTIF.decode(buffer);
  UTIF.decodeImage(buffer, ifds[0]!);
  const first = ifds[0]!;
  const pixelCount = first.width! * first.height!;
  const data = first.data;
  if (!(data instanceof Uint8Array) || data.length !== pixelCount) {
    throw new Error("expected packed 8-bit gray data");
  }
  return data.slice();
}

function encodeLittleEndianGray16Tiff(
  width: number,
  height: number,
  pixels: Uint16Array,
): Uint8Array {
  return encodeGrayTiff(width, height, pixels, {
    kind: "tiff",
    endian: "II",
    bitsPerSample: 16,
    compression: 1,
    photometric: 1,
    samplesPerPixel: 1,
    rowsPerStrip: height,
    planarConfiguration: 1,
  });
}

describe("gray tiff demo export", () => {
  it("round-trips uint16 pixels through MM encode and UTIF decode", () => {
    const width = 4;
    const height = 3;
    const source = new Uint16Array([
      100, 200, 300, 400, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000,
    ]);
    const encoded = encodeGrayTiff(width, height, source, {
      kind: "tiff",
      endian: "MM",
      bitsPerSample: 16,
      compression: 1,
      photometric: 1,
      samplesPerPixel: 1,
      rowsPerStrip: height,
      planarConfiguration: 1,
    });
    expect(Array.from(decodeUtifGray16(encoded))).toEqual(Array.from(source));
  });

  it("reads standard little-endian II TIFF files", () => {
    const width = 2;
    const height = 2;
    const source = new Uint16Array([100, 200, 300, 400]);
    const encoded = encodeLittleEndianGray16Tiff(width, height, source);
    expect(Array.from(decodeUtifGray16(encoded))).toEqual(Array.from(source));
  });

  it("preserves cropped roi values from a loaded 16-bit frame", () => {
    const width = 4;
    const height = 3;
    const source = new Uint16Array([
      100, 200, 300, 400, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000,
    ]);
    const profile = {
      kind: "tiff" as const,
      endian: "MM" as const,
      bitsPerSample: 16 as const,
      compression: 1,
      photometric: 1,
      samplesPerPixel: 1,
      rowsPerStrip: height,
      planarConfiguration: 1,
    };
    const frame = {
      width,
      height,
      pixels: decodeUtifGray16(encodeGrayTiff(width, height, source, profile)),
    };
    const cropped = cropFrameRegion(frame, { x: 1, y: 1, w: 2, h: 2 });
    expect(Array.from(cropped)).toEqual([2000, 3000, 6000, 7000]);
    expect(Array.from(decodeUtifGray16(encodeGrayTiff(2, 2, cropped, profile)))).toEqual([
      2000, 3000, 6000, 7000,
    ]);
  });

  it("round-trips 8-bit II TIFF export", () => {
    const width = 2;
    const height = 2;
    const source = new Uint8Array([10, 20, 30, 40]);
    const profile = {
      kind: "tiff" as const,
      endian: "II" as const,
      bitsPerSample: 8 as const,
      compression: 1,
      photometric: 1,
      samplesPerPixel: 1,
      rowsPerStrip: height,
      planarConfiguration: 1,
    };
    const encoded = encodeGrayTiff(width, height, source, profile);
    expect(Array.from(decodeUtifGray8(encoded))).toEqual(Array.from(source));
  });

  it("maps roi extensions from source format", () => {
    expect(roiImageExtension({ kind: "png" })).toBe("png");
    expect(roiImageExtension({ kind: "jpeg" })).toBe("jpg");
    expect(
      roiImageExtension({
        kind: "tiff",
        endian: "II",
        bitsPerSample: 16,
        compression: 1,
        photometric: 1,
        samplesPerPixel: 1,
        rowsPerStrip: 1,
        planarConfiguration: 1,
      }),
    ).toBe("tif");
  });
});
