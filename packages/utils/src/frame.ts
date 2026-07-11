import type { ContrastWindow, FramePayload, PixelType } from "@lisca/contracts";

export type PixelArray =
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array;

export type FrameResult = {
  width: number;
  height: number;
  pixels: PixelArray;
  pixelType?: PixelType;
  contrastDomain?: ContrastWindow;
  suggestedContrast?: ContrastWindow;
  appliedContrast?: ContrastWindow;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function selectedIndex(values: readonly number[] | undefined, value: number): number {
  return Math.max(0, values?.indexOf(value) ?? 0);
}

export function createPixelArray(pixelType: PixelType, buffer: ArrayBuffer): PixelArray {
  if (pixelType === "uint8") return new Uint8Array(buffer);
  if (pixelType === "uint8clamped") return new Uint8ClampedArray(buffer);
  if (pixelType === "int8") return new Int8Array(buffer);
  if (pixelType === "uint16") return new Uint16Array(buffer);
  if (pixelType === "int16") return new Int16Array(buffer);
  if (pixelType === "uint32") return new Uint32Array(buffer);
  return new Int32Array(buffer);
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === "function") {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]!);
    }
    return globalThis.btoa(binary);
  }

  const bufferCtor = (globalThis as { Buffer?: { from(input: Uint8Array): { toString(encoding: "base64"): string } } }).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString("base64");
  }

  throw new Error("Base64 encode is unavailable in this runtime");
}

export function encodeFramePayload(frame: FrameResult): FramePayload {
  const pixelType = frame.pixelType ?? "uint16";
  const domain = frame.contrastDomain ?? defaultContrastDomain(frame);
  const suggested = normalizeContrastWindow(frame.suggestedContrast ?? domain, domain);
  const applied = normalizeContrastWindow(frame.appliedContrast ?? suggested, domain);
  const pixels = frame.pixels;
  const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);

  return {
    width: frame.width,
    height: frame.height,
    dataBase64: bytesToBase64(bytes),
    pixelType,
    contrastDomain: domain,
    suggestedContrast: suggested,
    appliedContrast: applied,
  };
}

export function decodeFramePayload(payload: FramePayload): FrameResult {
  try {
    const binary = window.atob(payload.dataBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return {
      width: payload.width,
      height: payload.height,
      pixels: createPixelArray(payload.pixelType, bytes.buffer),
      pixelType: payload.pixelType,
      contrastDomain: payload.contrastDomain,
      suggestedContrast: payload.suggestedContrast,
      appliedContrast: payload.appliedContrast,
    };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Base64 decode failed: ${detail}`, { cause });
  }
}

export function defaultContrastDomain(frame: FrameResult): ContrastWindow {
  if (frame.pixelType === "uint8" || frame.pixelType === "uint8clamped") {
    return { min: 0, max: 255 };
  }
  return { min: 0, max: 65535 };
}

const CONTRAST_SAMPLE_SIZE = 2048;

function subsampleSortedGray(values: ArrayLike<number>, sampleSize: number): number[] {
  const length = values.length;
  if (length === 0) return [0];
  if (length <= sampleSize) {
    const copy = Array.from({ length }, (_, index) => Number(values[index] ?? 0));
    copy.sort((left, right) => left - right);
    return copy;
  }

  const step = length / sampleSize;
  const sample = Array.from({ length: sampleSize }, () => 0);
  for (let index = 0; index < sampleSize; index += 1) {
    const position = Math.min(length - 1, Math.floor(index * step));
    sample[index] = Number(values[position] ?? 0);
  }
  sample.sort((left, right) => left - right);
  return sample;
}

function quantileFloorSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;
  const clamped = Math.max(0, Math.min(1, q));
  const index = Math.floor(clamped * (sorted.length - 1));
  return sorted[index] ?? 0;
}

/** Match server-side auto-contrast (0.1% / 99.9% subsampled quantiles). */
export function autoContrastForGrayPixels(
  pixels: PixelArray,
  pixelType: PixelType,
): ContrastWindow {
  const sorted = subsampleSortedGray(pixels, CONTRAST_SAMPLE_SIZE);
  const min = quantileFloorSorted(sorted, 0.001);
  const max = Math.max(min + 1, quantileFloorSorted(sorted, 0.999));
  const domain = defaultContrastDomain({ pixelType } as FrameResult);
  return normalizeContrastWindow({ min, max }, domain);
}

export function normalizeContrastWindow(
  window: ContrastWindow,
  domain: ContrastWindow,
): ContrastWindow {
  return {
    min: clamp(Math.round(window.min), domain.min, Math.max(domain.min, domain.max - 1)),
    max: clamp(Math.round(window.max), Math.min(domain.min + 1, domain.max), domain.max),
  };
}

export function normalizeFrameContrast(frame: FrameResult): FrameResult {
  const domain = frame.contrastDomain ?? defaultContrastDomain(frame);
  const suggested = normalizeContrastWindow(frame.suggestedContrast ?? domain, domain);
  const applied = normalizeContrastWindow(frame.appliedContrast ?? suggested, domain);
  return {
    ...frame,
    contrastDomain: domain,
    suggestedContrast: suggested,
    appliedContrast: applied,
  };
}
