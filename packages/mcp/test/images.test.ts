import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { encodeGrayPng, isPng, renderFrame, type FramePixels } from "../src/images.ts";

function pngIdat(png: Buffer): { width: number; height: number; gray: Uint8Array } {
  // Walk chunks: 8-byte signature, then length/type/data/crc records.
  let offset = 8;
  let width = 0;
  let height = 0;
  let gray: Uint8Array = new Uint8Array(0);
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(8); // bit depth
      expect(data[9]).toBe(0); // grayscale
    } else if (type === "IDAT") {
      const raw = inflateSync(data);
      expect(raw.length).toBe(height * (width + 1));
      gray = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) {
        expect(raw[y * (width + 1)]).toBe(0); // filter: none
        for (let x = 0; x < width; x++) {
          gray[y * width + x] = raw[y * (width + 1) + 1 + x]!;
        }
      }
    }
    offset += 12 + length;
  }
  return { width, height, gray };
}

function frame(
  width: number,
  height: number,
  pixels: Uint8Array,
  pixelType = "uint8",
  extra: Partial<FramePixels> = {},
): FramePixels {
  return {
    width,
    height,
    dataBase64: Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength).toString("base64"),
    pixelType,
    ...extra,
  };
}

describe("encodeGrayPng", () => {
  it("round-trips 8-bit pixels", () => {
    const pixels = new Uint8Array([0, 100, 200, 255]);
    const png = encodeGrayPng(2, 2, pixels);
    expect(isPng(png)).toBe(true);
    const { width, height, gray } = pngIdat(png);
    expect(width).toBe(2);
    expect(height).toBe(2);
    expect(Array.from(gray)).toEqual([0, 100, 200, 255]);
  });

  it("handles uneven rows", () => {
    const pixels = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const png = encodeGrayPng(3, 2, pixels);
    expect(Array.from(pngIdat(png).gray)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("renderFrame", () => {
  it("applies the requested contrast window", () => {
    const pixels = new Uint8Array([0, 100, 200, 255]);
    const rendered = renderFrame(frame(2, 2, pixels), { min: 50, max: 250 });
    expect(rendered.applied).toEqual({ min: 50, max: 250 });
    expect(Array.from(pngIdat(rendered.png).gray)).toEqual([0, 64, 191, 255]);
  });

  it("falls back to the suggested contrast, then the pixel range", () => {
    const pixels = new Uint8Array([10, 20]);
    const suggested = renderFrame(
      frame(1, 2, pixels, "uint8", { suggestedContrast: { min: 0, max: 20 } }),
    );
    expect(suggested.applied).toEqual({ min: 0, max: 20 });
    expect(Array.from(pngIdat(suggested.png).gray)).toEqual([128, 255]);

    const ranged = renderFrame(frame(1, 2, pixels));
    expect(ranged.applied).toEqual({ min: 10, max: 20 });
  });

  it("decodes uint16 little-endian pixels", () => {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint16(0, 1000, true);
    view.setUint16(2, 2000, true);
    const rendered = renderFrame(
      {
        width: 2,
        height: 1,
        dataBase64: Buffer.from(buffer).toString("base64"),
        pixelType: "uint16",
      },
      { min: 0, max: 4095 },
    );
    expect(rendered.pixelMin).toBe(1000);
    expect(rendered.pixelMax).toBe(2000);
    expect(Array.from(pngIdat(rendered.png).gray)).toEqual([62, 125]);
  });

  it("decodes int16 pixels", () => {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setInt16(0, -500, true);
    view.setInt16(2, 500, true);
    const rendered = renderFrame(
      {
        width: 2,
        height: 1,
        dataBase64: Buffer.from(buffer).toString("base64"),
        pixelType: "int16",
      },
      { min: -1000, max: 1000 },
    );
    expect(Array.from(pngIdat(rendered.png).gray)).toEqual([64, 191]);
  });

  it("clamps a degenerate contrast window", () => {
    const rendered = renderFrame(frame(1, 1, new Uint8Array([7])), { min: 7, max: 7 });
    expect(Array.from(pngIdat(rendered.png).gray)).toEqual([128]);
  });

  it("rejects payloads with too few bytes", () => {
    expect(() => renderFrame(frame(2, 1, new Uint8Array([1])))).toThrow(/bytes/);
  });
});
