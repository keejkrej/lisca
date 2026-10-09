import type { AssayAnalysisConfig, AssaySampleRow } from "@lisca/contracts";
import type { StudioAssaySampleRow, StudioAssaySamples } from "@lisca/contracts/assay";

/** Inclusive 0-based position span, as stored in assay.json. */
export type StoredPositionRange = {
  start: number;
  end: number;
};

const DISPLAY_RANGE = /^(\d+)\s*[-:–—]\s*(\d+)$/;
const DISPLAY_SINGLE = /^(\d+)$/;
const PARTIAL_RANGE = /^\d+\s*[-:–—]\s*$/;
const STORED_RANGE = /^(\d+)\s*:\s*(\d+)$/;

function parseNonNegativeInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/** One inclusive 0-based span, written the way assay.json stores a single range. */
export function formatSamplePositions(positionStart: string, positionFinish: string): string {
  const start = parseNonNegativeInteger(positionStart);
  const finish = parseNonNegativeInteger(positionFinish);
  if (start == null || finish == null) return "";
  return formatStoredPositions([{ start: Math.min(start, finish), end: Math.max(start, finish) }]);
}

/** Merge overlaps and adjacent spans. A gap stays a separate range. */
export function mergePositionRanges(ranges: readonly StoredPositionRange[]): StoredPositionRange[] {
  const sorted = ranges
    .filter((range) => range.end >= range.start)
    .map((range) => ({ start: range.start, end: range.end }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: StoredPositionRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end + 1) {
      merged.push(range);
      continue;
    }
    last.end = Math.max(last.end, range.end);
  }
  return merged;
}

/** assay.json `positions` grammar: `3` or `0:4,20:24`. */
export function formatStoredPositions(ranges: readonly StoredPositionRange[]): string {
  return mergePositionRanges(ranges)
    .map((range) =>
      range.start === range.end ? String(range.start) : `${range.start}:${range.end}`,
    )
    .join(",");
}

/** 1-based chip label. A span uses an en dash. */
export function formatPositionChip(range: StoredPositionRange): string {
  const start = range.start + 1;
  const end = range.end + 1;
  return start === end ? String(start) : `${start}–${end}`;
}

/** Read assay.json `positions` into inclusive ranges. Invalid tokens are dropped. */
export function storedPositionRanges(positions: string): StoredPositionRange[] {
  const ranges: StoredPositionRange[] = [];
  for (const token of positions.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const range = STORED_RANGE.exec(trimmed);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (end >= start) ranges.push({ start, end });
      continue;
    }
    const single = parseNonNegativeInteger(trimmed);
    if (single != null) ranges.push({ start: single, end: single });
  }
  return mergePositionRanges(ranges);
}

export function normalizeStoredPositions(positions: string): string {
  return formatStoredPositions(storedPositionRanges(positions));
}

/** True when every token is a 0-based index or an inclusive `start:end` range. */
export function isValidStoredPositions(positions: string): boolean {
  const tokens = positions
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => {
    if (DISPLAY_SINGLE.test(token)) return true;
    const range = STORED_RANGE.exec(token);
    return range != null && Number(range[2]) >= Number(range[1]);
  });
}

function parseDisplayToken(token: string): StoredPositionRange | null {
  const trimmed = token.trim();
  const range = DISPLAY_RANGE.exec(trimmed);
  if (range) {
    const left = Number(range[1]);
    const right = Number(range[2]);
    if (left < 1 || right < 1) return null;
    return { start: Math.min(left, right) - 1, end: Math.max(left, right) - 1 };
  }
  if (!DISPLAY_SINGLE.test(trimmed)) return null;
  const value = Number(trimmed);
  if (value < 1) return null;
  return { start: value - 1, end: value - 1 };
}

export type DisplayPositionParse = {
  ranges: StoredPositionRange[];
  invalid: string;
};

/** Parse 1-based text (`1-5, 21-25` or `8`). Hyphen and colon both count. */
export function parseDisplayPositionList(raw: string): DisplayPositionParse {
  const ranges: StoredPositionRange[] = [];
  const invalid: string[] = [];
  for (const token of raw.split(",")) {
    if (!token.trim()) continue;
    const range = parseDisplayToken(token);
    if (range) ranges.push(range);
    else invalid.push(token.trim());
  }
  return { ranges: mergePositionRanges(ranges), invalid: invalid.join(", ") };
}

function isPartialRange(token: string): boolean {
  return PARTIAL_RANGE.test(token.trim());
}

/**
 * Tokens before a comma are ready to save. The trailing token stays in the field
 * until blur, Enter, or paste, so `21` can still become `21-25`.
 */
export function splitDisplayDraft(
  raw: string,
  commitTrailing: boolean,
): { ready: string; pending: string } {
  const endsWithComma = /,\s*$/.test(raw);
  const tokens = raw.split(",");
  const last = endsWithComma ? "" : (tokens[tokens.length - 1] ?? "");
  const readyTokens = endsWithComma ? tokens : tokens.slice(0, -1);
  if (commitTrailing && !isPartialRange(last)) {
    readyTokens.push(last);
    return { ready: readyTokens.join(","), pending: "" };
  }
  return { ready: readyTokens.join(","), pending: last };
}

/** Apply typed 1-based text onto the stored 0-based positions string. */
export function commitDisplayPositionDraft(
  stored: string,
  draft: string,
  commitTrailing: boolean,
): { positions: string; draft: string; invalid: boolean } {
  const split = splitDisplayDraft(draft, commitTrailing);
  const parsed = parseDisplayPositionList(split.ready);
  const positions =
    parsed.ranges.length === 0
      ? normalizeStoredPositions(stored)
      : formatStoredPositions(
          mergePositionRanges([...storedPositionRanges(stored), ...parsed.ranges]),
        );
  const leftover = [parsed.invalid, split.pending.trim()].filter(Boolean).join(", ");
  return {
    positions,
    draft: leftover,
    invalid: commitTrailing ? leftover.length > 0 : parsed.invalid.length > 0,
  };
}

/** Parse comma-separated non-negative ints (`"1"` / `"1,2"`). Empty → null. */
export function parseSignalChannels(raw: string): [number, ...number[]] | null {
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
  return [values[0]!, ...values.slice(1)];
}

export function formatSignalChannels(signal: readonly number[]): string {
  return signal.join(",");
}

function signalChannelsEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Resolve segmentation/signal for a sample (by name) from analysis defaults + per-sample overrides. */
export function resolveSampleChannels(
  analysis: AssayAnalysisConfig | null | undefined,
  sample: string,
): { segmentation: number; signal: number[] } | null {
  const name = sample.trim();
  const override = analysis?.sampleChannels?.find((entry) => entry.sample.trim() === name);
  if (override) {
    return { segmentation: override.segmentation, signal: [...override.signal] };
  }
  if (analysis?.channels) {
    return {
      segmentation: analysis.channels.segmentation,
      signal: [...analysis.channels.signal],
    };
  }
  return null;
}

/** Derive on-disk analysis channel fields from UI sample rows. */
export function analysisChannelsFromSamples(
  samples: readonly {
    name: string;
    segmentation: string;
    signal: string;
  }[],
): Pick<AssayAnalysisConfig, "channels" | "sampleChannels"> {
  const rows: { sample: string; segmentation: number; signal: [number, ...number[]] }[] = [];
  for (const row of samples) {
    const sample = row.name.trim();
    if (!sample) continue;
    const segmentation = parseNonNegativeInteger(row.segmentation);
    const signal = parseSignalChannels(row.signal);
    if (segmentation == null || signal == null) continue;
    rows.push({ sample, segmentation, signal });
  }
  if (rows.length === 0) return {};

  const channels = { segmentation: rows[0]!.segmentation, signal: rows[0]!.signal };
  const sampleChannels = rows.filter(
    (row) =>
      row.segmentation !== channels.segmentation ||
      !signalChannelsEqual(row.signal, channels.signal),
  );
  return {
    channels,
    ...(sampleChannels.length > 0 ? { sampleChannels } : {}),
  };
}

export function sampleRowToDisk(row: { positions: string; name: string }): AssaySampleRow {
  return {
    name: row.name.trim(),
    positions: normalizeStoredPositions(row.positions),
  };
}

export function sampleRowFromDisk(
  record: AssaySampleRow,
  analysis?: AssayAnalysisConfig | null,
): {
  name: string;
  positions: string;
  segmentation: string;
  signal: string;
} {
  const channels = resolveSampleChannels(analysis, record.name);
  return {
    name: record.name,
    positions: normalizeStoredPositions(record.positions),
    segmentation: channels != null ? String(channels.segmentation) : "",
    signal: channels != null ? formatSignalChannels(channels.signal) : "",
  };
}

/**
 * The Metadata editor shows positions 1-based; state and assay.json stay 0-based.
 * Stored `""` or non-integer text shows as empty.
 */
export function samplePositionToDisplay(stored: string): string {
  const value = parseNonNegativeInteger(stored);
  return value == null ? "" : String(value + 1);
}

/**
 * Convert typed 1-based text to the stored 0-based string. Returns `""` for empty input
 * and `null` when the text is not an integer >= 1.
 */
export function samplePositionFromDisplay(raw: string): string | null {
  if (raw.trim() === "") return "";
  const value = parseNonNegativeInteger(raw);
  return value == null || value < 1 ? null : String(value - 1);
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

/** Expand a stored positions string into individual 0-based indexes. */
export function expandStoredPositions(positions: string): number[] {
  const values: number[] = [];
  for (const range of storedPositionRanges(positions)) {
    for (let pos = range.start; pos <= range.end; pos += 1) values.push(pos);
  }
  return values;
}

/** Union of all sample-row position ranges, sorted unique. */
export function collectAssayPositions(samples: StudioAssaySamples): number[] {
  const rows = samples.samples ?? [];
  const seen = new Set<number>();
  for (const row of rows) {
    for (const pos of expandStoredPositions(row.positions)) seen.add(pos);
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
