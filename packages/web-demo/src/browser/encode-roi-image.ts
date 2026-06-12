import type { PixelType } from "@lisca/contracts";

import { encodeRasterGrayImage } from "./encode-raster-image";
import { encodeGrayTiff } from "./encode-gray-tiff";
import { type SourceImageFormat } from "./source-image-format";

function cropToNativePixels(
  pixels: Uint16Array,
  pixelType: PixelType | undefined,
  bitsPerSample: 8 | 16,
): Uint8Array | Uint16Array {
  if (bitsPerSample === 16 || pixelType === "uint16" || pixelType === "int16") {
    return pixels;
  }
  const packed = new Uint8Array(pixels.length);
  for (let index = 0; index < pixels.length; index += 1) {
    packed[index] = Number(pixels[index] ?? 0) & 0xff;
  }
  return packed;
}

export async function encodeRoiImage(
  format: SourceImageFormat,
  width: number,
  height: number,
  pixels: Uint16Array,
  pixelType: PixelType | undefined,
): Promise<Uint8Array> {
  if (format.kind === "png") {
    return encodeRasterGrayImage("png", width, height, cropToNativePixels(pixels, pixelType, 8));
  }
  if (format.kind === "jpeg") {
    return encodeRasterGrayImage("jpeg", width, height, cropToNativePixels(pixels, pixelType, 8));
  }
  const native = cropToNativePixels(pixels, pixelType, format.bitsPerSample);
  return encodeGrayTiff(width, height, native, format);
}
