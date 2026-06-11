import type { PixelType } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

export type TiffImageFormat = {
  kind: "tiff";
  endian: "II" | "MM";
  bitsPerSample: 8 | 16;
  compression: number;
  photometric: number;
  samplesPerPixel: number;
  rowsPerStrip: number;
  planarConfiguration: number;
  predictor?: number;
};

export type SourceImageFormat =
  | { kind: "png" }
  | { kind: "jpeg" }
  | TiffImageFormat;

export type LoadedImageFile = {
  frame: FrameResult;
  format: SourceImageFormat;
};

type UtifIfd = {
  width?: number;
  height?: number;
  isLE?: boolean;
  t258?: number[];
  t259?: number[];
  t262?: number[];
  t277?: number[];
  t278?: number[];
  t284?: number[];
  t317?: number[];
};

function isPngFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".png");
}

function isJpegFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
}

function isTiffFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".tif") || lower.endsWith(".tiff");
}

export function sourceFormatFromFile(file: File): SourceImageFormat | null {
  if (isPngFile(file)) return { kind: "png" };
  if (isJpegFile(file)) return { kind: "jpeg" };
  if (isTiffFile(file)) return null;
  return null;
}

export function tiffFormatFromIfd(ifd: UtifIfd): TiffImageFormat {
  const height = ifd.height ?? 1;
  return {
    kind: "tiff",
    endian: ifd.isLE ? "II" : "MM",
    bitsPerSample: (ifd.t258?.[0] === 16 ? 16 : 8) as 8 | 16,
    compression: ifd.t259?.[0] ?? 1,
    photometric: ifd.t262?.[0] ?? 1,
    samplesPerPixel: ifd.t277?.[0] ?? 1,
    rowsPerStrip: ifd.t278?.[0] ?? height,
    planarConfiguration: ifd.t284?.[0] ?? 1,
    predictor: ifd.t317?.[0],
  };
}

export function roiImageExtension(format: SourceImageFormat): string {
  if (format.kind === "png") return "png";
  if (format.kind === "jpeg") return "jpg";
  return "tif";
}

export function pixelTypeForTiffFormat(format: TiffImageFormat): PixelType {
  return format.bitsPerSample === 16 ? "uint16" : "uint8";
}
