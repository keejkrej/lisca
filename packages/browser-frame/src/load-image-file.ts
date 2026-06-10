import type { FrameResult, PixelType } from "@lisca/contracts";
import { autoContrastForGrayPixels, normalizeFrameContrast } from "@lisca/utils";
import UTIF from "utif";

function luminance(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

function contrastForPixelType(pixelType: PixelType): FrameResult {
  const domain =
    pixelType === "uint8" || pixelType === "uint8clamped"
      ? { min: 0, max: 255 }
      : { min: 0, max: 65535 };
  return {
    width: 0,
    height: 0,
    pixels: new Uint8Array(),
    pixelType,
    contrastDomain: domain,
    suggestedContrast: domain,
    appliedContrast: domain,
  };
}

function frameFromGrayPixels(
  width: number,
  height: number,
  pixels: FrameResult["pixels"],
  pixelType: PixelType,
): FrameResult {
  const template = contrastForPixelType(pixelType);
  const suggested = autoContrastForGrayPixels(pixels, pixelType);
  return normalizeFrameContrast({
    width,
    height,
    pixels,
    pixelType: template.pixelType,
    contrastDomain: template.contrastDomain,
    suggestedContrast: suggested,
    appliedContrast: suggested,
  });
}

async function loadRasterImage(file: File): Promise<FrameResult> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to prepare image canvas");
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const pixels = new Uint8Array(bitmap.width * bitmap.height);
    for (let index = 0; index < pixels.length; index += 1) {
      const offset = index * 4;
      pixels[index] = luminance(
        imageData.data[offset] ?? 0,
        imageData.data[offset + 1] ?? 0,
        imageData.data[offset + 2] ?? 0,
      );
    }
    return frameFromGrayPixels(bitmap.width, bitmap.height, pixels, "uint8");
  } finally {
    bitmap.close();
  }
}

function normalizeTiffImageData(
  width: number,
  height: number,
  data: Uint8Array | Uint16Array | Int16Array | Float32Array,
): Uint8Array | Uint16Array | Int16Array | Float32Array {
  const pixelCount = width * height;
  if (data instanceof Uint8Array && data.length === pixelCount * 2) {
    const pixels = new Uint16Array(pixelCount);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let index = 0; index < pixelCount; index += 1) {
      pixels[index] = view.getUint16(index * 2, true);
    }
    return pixels;
  }
  return data;
}

function grayPixelsFromTiffData(
  width: number,
  height: number,
  data: Uint8Array | Uint16Array | Int16Array | Float32Array,
): { pixels: FrameResult["pixels"]; pixelType: PixelType } {
  const pixelCount = width * height;
  if (data.length === pixelCount) {
    if (data instanceof Uint8Array) {
      return { pixels: data.slice(), pixelType: "uint8" };
    }
    if (data instanceof Uint16Array) {
      return { pixels: data.slice(), pixelType: "uint16" };
    }
    if (data instanceof Int16Array) {
      return { pixels: data.slice(), pixelType: "int16" };
    }
    const pixels = new Uint16Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
      pixels[index] = Math.max(0, Math.round(data[index] ?? 0));
    }
    return { pixels, pixelType: "uint16" };
  }

  if (data.length === pixelCount * 3) {
    const pixels = new Uint8Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 3;
      pixels[index] = luminance(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
    }
    return { pixels, pixelType: "uint8" };
  }

  if (data.length === pixelCount * 4) {
    const pixels = new Uint8Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 4;
      pixels[index] = luminance(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
    }
    return { pixels, pixelType: "uint8" };
  }

  throw new Error(
    `Unsupported TIFF sample layout (${data.length} samples for ${pixelCount} pixels)`,
  );
}

async function loadTiffImage(file: File): Promise<FrameResult> {
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (ifds.length === 0) throw new Error("TIFF file contains no images");
  UTIF.decodeImage(buffer, ifds[0]!);
  const first = ifds[0]!;
  const width = first.width;
  const height = first.height;
  if (!width || !height) throw new Error("TIFF image dimensions are missing");
  const data = first.data;
  if (!data) throw new Error("TIFF image data is missing");
  const normalized = normalizeTiffImageData(width, height, data);
  const { pixels, pixelType } = grayPixelsFromTiffData(width, height, normalized);
  return frameFromGrayPixels(width, height, pixels, pixelType);
}

function isTiffFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".tif") || lower.endsWith(".tiff");
}

export async function loadImageFile(file: File): Promise<FrameResult> {
  if (isTiffFile(file)) return loadTiffImage(file);
  return loadRasterImage(file);
}
