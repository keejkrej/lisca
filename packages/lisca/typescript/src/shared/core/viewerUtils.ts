import { clamp } from "./utils";

import type {
  ContrastWindow,
  FrameResult,
  PixelArray,
  PixelType,
  ViewerSelection,
  ViewerSource,
  WorkspaceScan,
} from "lisca/shared/contracts";

const SAMPLE_SIZE = 2048;

export function createSelection(scan: WorkspaceScan, initial?: Partial<ViewerSelection>): ViewerSelection {
  return {
    pos: initial?.pos ?? scan.positions[0] ?? 0,
    channel: initial?.channel ?? scan.channels[0] ?? 0,
    time: initial?.time ?? scan.times[0] ?? 0,
    z: initial?.z ?? scan.zSlices[0] ?? 0,
  };
}

export function coerceSelection(scan: WorkspaceScan, selection: ViewerSelection): ViewerSelection {
  return {
    pos: scan.positions.includes(selection.pos) ? selection.pos : (scan.positions[0] ?? 0),
    channel: scan.channels.includes(selection.channel)
      ? selection.channel
      : (scan.channels[0] ?? 0),
    time: scan.times.includes(selection.time) ? selection.time : (scan.times[0] ?? 0),
    z: scan.zSlices.includes(selection.z) ? selection.z : (scan.zSlices[0] ?? 0),
  };
}

function sampledValues(values: PixelArray): number[] {
  if (values.length <= SAMPLE_SIZE) {
    const copy = Array.from(values);
    copy.sort((a, b) => a - b);
    return copy;
  }
  const step = values.length / SAMPLE_SIZE;
  const sample = new Array<number>(SAMPLE_SIZE);
  for (let i = 0; i < SAMPLE_SIZE; i += 1) {
    sample[i] = values[Math.floor(i * step)] ?? 0;
  }
  sample.sort((a, b) => a - b);
  return sample;
}

export function percentile(values: PixelArray, q: number): number {
  if (values.length === 0) return 0;
  const sorted = sampledValues(values);
  const clampedQ = clamp(q, 0, 1);
  const index = Math.floor(clampedQ * (sorted.length - 1));
  return sorted[index] ?? 0;
}

export function autoContrast(values: PixelArray): ContrastWindow {
  if (values.length === 0) {
    return { min: 0, max: 1 };
  }
  const min = percentile(values, 0.001);
  const max = percentile(values, 0.999);
  return {
    min,
    max: Math.max(min + 1, max),
  };
}

function inferPixelType(values: PixelArray): PixelType | null {
  if (values instanceof Uint8Array) return "uint8";
  if (values instanceof Uint8ClampedArray) return "uint8clamped";
  if (values instanceof Int8Array) return "int8";
  if (values instanceof Uint16Array) return "uint16";
  if (values instanceof Int16Array) return "int16";
  if (values instanceof Uint32Array) return "uint32";
  if (values instanceof Int32Array) return "int32";
  return null;
}

export function getFrameContrastDomain(frame: FrameResult) {
  const pixelType = frame.pixelType ?? inferPixelType(frame.pixels);
  switch (pixelType) {
    case "uint8":
    case "uint8clamped":
      return { min: 0, max: 255 };
    case "int8":
      return { min: -128, max: 127 };
    case "uint16":
      return { min: 0, max: 65535 };
    case "int16":
      return { min: -32768, max: 32767 };
    case "uint32":
      return { min: 0, max: 4294967295 };
    case "int32":
      return { min: -2147483648, max: 2147483647 };
    default:
      return { min: 0, max: Math.max(1, Math.ceil(percentile(frame.pixels, 1))) };
  }
}

export function makeSourceKey(source: ViewerSource): string {
  return `${source.kind}:${source.path}`;
}

export function makeFrameKey(source: ViewerSource, selection: ViewerSelection): string {
  return `${makeSourceKey(source)}:${selection.pos}:${selection.channel}:${selection.time}:${selection.z}`;
}
