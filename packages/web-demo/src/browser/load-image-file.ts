import type { PixelType } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { autoContrastForGrayPixels, normalizeFrameContrast } from "@lisca/utils";
import UTIF from "utif";

import {
  sourceFormatFromFile,
  tiffFormatFromIfd,
  type LoadedImageFile,
  type SourceImageFormat,
} from "./source-image-format";

export const IBIDI_MICROPATTERNING_IMAGE_BASE =
  "https://ibidi.com/img/cms/applications/micropatterning";

/** ibidi micropatterning example images — fetched at runtime, not bundled. */
export const IBIDI_DEMO_SAMPLE_IMAGES = {
  singleCell: `${IBIDI_MICROPATTERNING_IMAGE_BASE}/mp_example_singlecell.jpg`,
  multiCell: `${IBIDI_MICROPATTERNING_IMAGE_BASE}/mp_example_multicell.jpg`,
  rccComposite: `${IBIDI_MICROPATTERNING_IMAGE_BASE}/mp_RCC_4x_composite.jpg`,
  ratComposite: `${IBIDI_MICROPATTERNING_IMAGE_BASE}/Rat1_10x_composite.jpg`,
} as const;

/** Same-origin path used when ibidi blocks cross-origin fetch (see landing vite proxy). */
export function resolveRemoteDemoImageUrl(url: string): string {
  if (!url.startsWith(`${IBIDI_MICROPATTERNING_IMAGE_BASE}/`)) return url;
  const fileName = url.slice(IBIDI_MICROPATTERNING_IMAGE_BASE.length + 1);
  return `/demo-images/ibidi/${fileName}`;
}

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

function formatFromFileName(fileName: string): SourceImageFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return { kind: "png" };
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return { kind: "jpeg" };
  return { kind: "jpeg" };
}

async function loadRasterBlob(blob: Blob, format: SourceImageFormat): Promise<LoadedImageFile> {
  const bitmap = await createImageBitmap(blob);
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
    return {
      frame: frameFromGrayPixels(bitmap.width, bitmap.height, pixels, "uint8"),
      format,
    };
  } finally {
    bitmap.close();
  }
}

async function loadRasterImage(file: File): Promise<LoadedImageFile> {
  const format = sourceFormatFromFile(file);
  if (!format) throw new Error("Unsupported image format");
  return loadRasterBlob(file, format);
}

function unpackUtifGray16(data: Uint8Array): Uint16Array {
  const pixelCount = data.length / 2;
  const pixels = new Uint16Array(pixelCount);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let index = 0; index < pixelCount; index += 1) {
    pixels[index] = view.getUint16(index * 2, true);
  }
  return pixels;
}

function normalizeTiffImageData(
  width: number,
  height: number,
  data: Uint8Array | Uint16Array | Int16Array | Float32Array,
): Uint8Array | Uint16Array | Int16Array | Float32Array {
  const pixelCount = width * height;
  if (data instanceof Uint8Array && data.length === pixelCount * 2) {
    return unpackUtifGray16(data);
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

async function loadTiffImage(file: File): Promise<LoadedImageFile> {
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
  return {
    frame: frameFromGrayPixels(width, height, pixels, pixelType),
    format: tiffFormatFromIfd(first),
  };
}

function isTiffFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".tif") || lower.endsWith(".tiff");
}

export type { LoadedImageFile } from "./source-image-format";

export async function loadImageFile(file: File): Promise<LoadedImageFile> {
  if (isTiffFile(file)) return loadTiffImage(file);
  return loadRasterImage(file);
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }
  return response.blob();
}

/** Load a remote JPEG/PNG into a grayscale frame. Tries the canonical URL, then a same-origin proxy path. */
export async function loadImageFromUrl(url: string): Promise<LoadedImageFile> {
  const fileName = url.split("/").pop() ?? "sample.jpg";
  const format = formatFromFileName(fileName);
  const candidates = [url, resolveRemoteDemoImageUrl(url)].filter(
    (candidate, index, all) => all.indexOf(candidate) === index,
  );

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const blob = await fetchImageBlob(candidate);
      return loadRasterBlob(blob, format);
    } catch (cause) {
      lastError = cause;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
