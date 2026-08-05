import type { AssaySampleRow } from "@lisca/contracts";
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

export function sampleRowToDisk(row: {
  positionStart: string;
  positionFinish: string;
  slide: string;
  name: string;
  brightfield: string;
  fluorescence: string;
}): AssaySampleRow {
  return {
    slide: row.slide,
    name: row.name,
    brightfield: row.brightfield,
    fluorescence: row.fluorescence,
    positions: formatSamplePositions(row.positionStart, row.positionFinish),
  };
}

export function sampleRowFromDisk(record: AssaySampleRow): SamplePositionRange & {
  slide: string;
  name: string;
  brightfield: string;
  fluorescence: string;
} {
  const range = parseSamplePositions(record.positions);
  return {
    slide: record.slide,
    name: record.name,
    brightfield: record.brightfield,
    fluorescence: record.fluorescence,
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
