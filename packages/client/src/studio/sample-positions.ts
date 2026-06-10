import type { StudioBasicInfoStep3 } from "@lisca/contracts/assay";

export type SamplePositionRange = {
  positionStart: string;
  positionFinish: string;
};

function parsePositiveInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

export function formatSamplePositions(positionStart: string, positionFinish: string): string {
  const start = parsePositiveInteger(positionStart);
  const finish = parsePositiveInteger(positionFinish);
  if (start == null || finish == null) return "";
  const low = Math.min(start, finish);
  const high = Math.max(start, finish);
  return low === high ? String(low) : `${low}:${high}`;
}

/** Parse legacy assay.json `positions` strings into start/finish (load only). */
export function parseLegacySamplePositions(positions: string): SamplePositionRange {
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
      const value = parsePositiveInteger(rangeParts[0] ?? "");
      if (value == null) continue;
      min = min == null ? value : Math.min(min, value);
      max = max == null ? value : Math.max(max, value);
      continue;
    }

    if (rangeParts.length >= 2) {
      const start = parsePositiveInteger(rangeParts[0] ?? "");
      const stop = parsePositiveInteger(rangeParts[1] ?? "");
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

export function sampleRowToDisk(row: {
  positionStart: string;
  positionFinish: string;
  channel: string;
  name: string;
  maskChannel: string;
  signalChannel: string;
}) {
  return {
    ...row,
    positions: formatSamplePositions(row.positionStart, row.positionFinish),
  };
}

export function sampleRowFromDisk(record: {
  positions?: string;
  positionStart?: string;
  positionFinish?: string;
  channel: string;
  name: string;
  maskChannel: string;
  signalChannel: string;
}): SamplePositionRange & {
  channel: string;
  name: string;
  maskChannel: string;
  signalChannel: string;
} {
  const start = record.positionStart?.trim() ?? "";
  const finish = record.positionFinish?.trim() ?? "";
  if (start && finish) {
    return {
      channel: record.channel,
      name: record.name,
      maskChannel: record.maskChannel,
      signalChannel: record.signalChannel,
      positionStart: start,
      positionFinish: finish,
    };
  }
  const legacy = parseLegacySamplePositions(record.positions ?? "");
  return {
    channel: record.channel,
    name: record.name,
    maskChannel: record.maskChannel,
    signalChannel: record.signalChannel,
    positionStart: legacy.positionStart,
    positionFinish: legacy.positionFinish,
  };
}

export function isValidSamplePositionRange(positionStart: string, positionFinish: string): boolean {
  const start = parsePositiveInteger(positionStart);
  const finish = parsePositiveInteger(positionFinish);
  return start != null && finish != null && finish >= start;
}

/** Expand an inclusive 1-based position range into individual position indices. */
export function expandPositionRange(positionStart: string, positionFinish: string): number[] {
  const start = parsePositiveInteger(positionStart);
  const finish = parsePositiveInteger(positionFinish);
  if (start == null || finish == null || finish < start) return [];
  const positions: number[] = [];
  for (let pos = start; pos <= finish; pos += 1) {
    positions.push(pos);
  }
  return positions;
}

/** Union of all sample-row position ranges on the selected slide, sorted unique. */
export function collectAssayPositions(info3: StudioBasicInfoStep3): number[] {
  const rows = info3.samplesBySlide[info3.selectedSlideId] ?? [];
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
