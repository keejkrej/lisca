import type { AssayAnalysisConfig, AssaySampleRow } from "@lisca/contracts";
import type { StudioAssaySampleRow, StudioAssaySamples } from "@lisca/contracts/assay";

export type SamplePositionRange = {
  positionStart: string;
  positionFinish: string;
};

function parseNonNegativeInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function formatSamplePositions(positionStart: string, positionFinish: string): string {
  const start = parseNonNegativeInteger(positionStart);
  const finish = parseNonNegativeInteger(positionFinish);
  if (start == null || finish == null) return "";
  const low = Math.min(start, finish);
  const high = Math.max(start, finish);
  return low === high ? String(low) : `${low}:${high}`;
}

/** Parse assay.json `positions` strings into start/finish for the UI editor. */
export function parseSamplePositions(positions: string): SamplePositionRange {
  const trimmed = positions.trim();
  if (!trimmed) {
    return { positionStart: "", positionFinish: "" };
  }

  const tokens = trimmed
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  let min: number | null = null;
  let max: number | null = null;

  for (const token of tokens) {
    const rangeParts = token.split(":").map((part) => part.trim());
    if (rangeParts.length === 1) {
      const value = parseNonNegativeInteger(rangeParts[0] ?? "");
      if (value == null) continue;
      min = min == null ? value : Math.min(min, value);
      max = max == null ? value : Math.max(max, value);
      continue;
    }

    if (rangeParts.length >= 2) {
      const start = parseNonNegativeInteger(rangeParts[0] ?? "");
      const stop = parseNonNegativeInteger(rangeParts[1] ?? "");
      if (start == null || stop == null) continue;
      min = min == null ? Math.min(start, stop) : Math.min(min, start, stop);
      max = max == null ? Math.max(start, stop) : Math.max(max, start, stop);
    }
  }

  if (min == null || max == null) {
    return { positionStart: "", positionFinish: "" };
  }

  return {
    positionStart: String(min),
    positionFinish: String(max),
  };
}

/** @deprecated Use parseSamplePositions */
export const parseLegacySamplePositions = parseSamplePositions;

/** Parse comma-separated non-negative ints (`"1"` / `"1,2"`). Empty → null. */
export function parseSignalChannels(raw: string): number[] | null {
  const tokens = raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const values: number[] = [];
  for (const token of tokens) {
    const value = parseNonNegativeInteger(token);
    if (value == null) return null;
    values.push(value);
  }
  return values;
}

export function formatSignalChannels(signal: readonly number[]): string {
  return signal.join(",");
}

function signalChannelsEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Resolve mask/signal for a slide channel from analysis defaults + per-sample overrides. */
export function resolveSampleChannels(
  analysis: AssayAnalysisConfig | null | undefined,
  slideChannel: number,
): { mask: number; signal: number[] } | null {
  const override = analysis?.sampleChannels?.find((entry) => entry.slideChannel === slideChannel);
  if (override) {
    return { mask: override.mask, signal: [...override.signal] };
  }
  if (analysis?.channels) {
    return { mask: analysis.channels.mask, signal: [...analysis.channels.signal] };
  }
  return null;
}

/** Derive on-disk analysis channel fields from UI sample rows. */
export function analysisChannelsFromSamples(
  samples: readonly {
    slideChannel: string;
    name: string;
    mask: string;
    signal: string;
  }[],
): Pick<AssayAnalysisConfig, "channels" | "sampleChannels"> {
  const rows: { slideChannel: number; mask: number; signal: number[] }[] = [];
  for (const sample of samples) {
    if (!sample.name.trim()) continue;
    const slideChannel = parseNonNegativeInteger(sample.slideChannel);
    const mask = parseNonNegativeInteger(sample.mask);
    const signal = parseSignalChannels(sample.signal);
    if (slideChannel == null || mask == null || signal == null) continue;
    rows.push({ slideChannel, mask, signal });
  }
  if (rows.length === 0) return {};

  const channels = { mask: rows[0]!.mask, signal: [...rows[0]!.signal] };
  const sampleChannels = rows.filter(
    (row) => row.mask !== channels.mask || !signalChannelsEqual(row.signal, channels.signal),
  );
  return {
    channels,
    ...(sampleChannels.length > 0 ? { sampleChannels } : {}),
  };
}

export function sampleRowToDisk(row: {
  positionStart: string;
  positionFinish: string;
  slideChannel: string;
  name: string;
}): AssaySampleRow {
  const slideChannel = parseNonNegativeInteger(row.slideChannel);
  return {
    slideChannel: slideChannel ?? 0,
    name: row.name,
    positions: formatSamplePositions(row.positionStart, row.positionFinish),
  };
}

export function sampleRowFromDisk(
  record: AssaySampleRow,
  analysis?: AssayAnalysisConfig | null,
): SamplePositionRange & {
  slideChannel: string;
  name: string;
  mask: string;
  signal: string;
} {
  const range = parseSamplePositions(record.positions);
  const channels = resolveSampleChannels(analysis, record.slideChannel);
  return {
    slideChannel: String(record.slideChannel),
    name: record.name,
    mask: channels != null ? String(channels.mask) : "",
    signal: channels != null ? formatSignalChannels(channels.signal) : "",
    positionStart: range.positionStart,
    positionFinish: range.positionFinish,
  };
}

export function isValidSamplePositionRange(positionStart: string, positionFinish: string): boolean {
  const start = parseNonNegativeInteger(positionStart);
  const finish = parseNonNegativeInteger(positionFinish);
  return start != null && finish != null && finish >= start;
}

/** Expand an inclusive 0-based position range into individual position indices. */
export function expandPositionRange(positionStart: string, positionFinish: string): number[] {
  const start = parseNonNegativeInteger(positionStart);
  const finish = parseNonNegativeInteger(positionFinish);
  if (start == null || finish == null || finish < start) return [];
  const positions: number[] = [];
  for (let pos = start; pos <= finish; pos += 1) {
    positions.push(pos);
  }
  return positions;
}

/** Union of all sample-row position ranges, sorted unique. */
export function collectAssayPositions(samples: StudioAssaySamples): number[] {
  const rows = samples.samples ?? [];
  const seen = new Set<number>();
  for (const row of rows) {
    for (const pos of expandPositionRange(row.positionStart, row.positionFinish)) {
      seen.add(pos);
    }
  }
  return [...seen].toSorted((a, b) => a - b);
}

/** Keep source scan order, retaining only positions declared in the assay. */
export function filterScanPositionsForAssay(
  scanPositions: number[],
  assayPositions: number[],
): number[] {
  if (assayPositions.length === 0) return [];
  const allowed = new Set(assayPositions);
  return scanPositions.filter((pos) => allowed.has(pos));
}

export type { StudioAssaySampleRow };
