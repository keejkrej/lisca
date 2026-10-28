import type { WorkspaceScan } from "@lisca/contracts";
import { POSITION_INDEX_VERSION } from "@lisca/contracts/assay";

import {
  expandStoredPositions,
  formatStoredPositions,
  mergePositionRanges,
  splitDisplayDraft,
  storedPositionRanges,
  type StoredPositionRange,
} from "./sample-positions";

export { POSITION_INDEX_VERSION };

export type SourceKind = "folder" | "nd2" | "czi";

/** Detected positions: file/request ids plus the labels shown to the user. */
export type PositionCatalog = {
  kind: SourceKind;
  /** `WorkspaceScan.positions` — FrameRequest / `Pos{n}` identity. */
  ids: readonly number[];
  /** Display labels, same length as `ids`. Never the hidden 0-based index. */
  labels: readonly string[];
};

export type PositionMigrateResult =
  | { ok: true; positions: string; version: typeof POSITION_INDEX_VERSION }
  | { ok: false; error: string };

const DISPLAY_RANGE = /^(\d+)\s*[-:–—]\s*(\d+)$/;
const DISPLAY_SINGLE = /^(\d+)$/;

function parseNonNegativeInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function defaultLabels(kind: SourceKind, ids: readonly number[]): string[] {
  if (kind === "folder") return ids.map((id) => String(id));
  return ids.map((_, index) => String(index + 1));
}

export function catalogFromScan(
  kind: SourceKind | null | undefined,
  scan: Pick<WorkspaceScan, "positions" | "positionLabels">,
): PositionCatalog | null {
  if (kind !== "folder" && kind !== "nd2" && kind !== "czi") return null;
  const ids = scan.positions;
  const rawLabels = scan.positionLabels;
  const labels =
    rawLabels != null && rawLabels.length === ids.length
      ? [...rawLabels]
      : defaultLabels(kind, ids);
  return { kind, ids, labels };
}

/** Sequential catalog for tests: ND2/CZI ids 0..n-1 labeled 1..n; folder ids 1..n. */
export function sequentialCatalog(kind: SourceKind, count: number): PositionCatalog {
  const ids = Array.from({ length: count }, (_, index) => (kind === "folder" ? index + 1 : index));
  const labels = Array.from({ length: count }, (_, index) => String(index + 1));
  return { kind, ids, labels };
}

export function sparseFolderCatalog(folderNumbers: readonly number[]): PositionCatalog {
  return {
    kind: "folder",
    ids: [...folderNumbers],
    labels: folderNumbers.map((value) => String(value)),
  };
}

/**
 * Pre-0.5.1 lookup: folder numbers match the folder name, then fall back to a
 * 0-based index; ND2/CZI numbers are already 0-based indices.
 * Returns the 0-based index, or null when the number does not resolve.
 */
export function resolveLegacyNumber(stored: number, catalog: PositionCatalog): number | null {
  if (catalog.kind === "folder") {
    const byName = catalog.ids.indexOf(stored);
    if (byName >= 0) return byName;
  }
  if (stored >= 0 && stored < catalog.ids.length) return stored;
  return null;
}

export function resolveIndex(stored: number, catalog: PositionCatalog): number | null {
  if (stored >= 0 && stored < catalog.ids.length) return stored;
  return null;
}

function formatCatalogRange(catalog: PositionCatalog): string {
  if (catalog.labels.length === 0) return "no detected positions";
  const first = catalog.labels[0];
  const last = catalog.labels[catalog.labels.length - 1];
  const prefix = catalog.kind === "folder" ? "Pos" : "";
  return `${catalog.labels.length} positions: ${prefix}${first} to ${prefix}${last}`;
}

function refuseMessage(stored: number, catalog: PositionCatalog): string {
  return (
    `Position ${stored} is not in this source (${formatCatalogRange(catalog)}). ` +
    "Re-select positions on Metadata. Refusing to guess a neighbouring position " +
    "because this assay.json uses a different position encoding than the source list."
  );
}

function indicesToStored(indices: readonly number[]): string {
  const ranges: StoredPositionRange[] = indices.map((index) => ({ start: index, end: index }));
  return formatStoredPositions(ranges);
}

function resolveNumbers(
  numbers: readonly number[],
  version: number | null | undefined,
  catalog: PositionCatalog,
): PositionMigrateResult {
  const indices: number[] = [];
  const seen = new Set<number>();
  const versioned = version === POSITION_INDEX_VERSION;
  for (const stored of numbers) {
    const index = versioned ? resolveIndex(stored, catalog) : resolveLegacyNumber(stored, catalog);
    if (index == null) return { ok: false, error: refuseMessage(stored, catalog) };
    if (seen.has(index)) continue;
    seen.add(index);
    indices.push(index);
  }
  return {
    ok: true,
    positions: indicesToStored(indices),
    version: POSITION_INDEX_VERSION,
  };
}

/**
 * Convert a stored `positions` string to version-1 0-based indices.
 * Legacy configs resolve through the old folder-name / ND2-index rules so the
 * same physical positions are kept. Unknown numbers are refused.
 */
export function migrateStoredPositions(
  positions: string,
  version: number | null | undefined,
  catalog: PositionCatalog,
): PositionMigrateResult {
  const numbers = expandStoredPositions(positions);
  if (numbers.length === 0) {
    return { ok: true, positions: "", version: POSITION_INDEX_VERSION };
  }
  return resolveNumbers(numbers, version, catalog);
}

export function fileIdsForIndices(indices: readonly number[], catalog: PositionCatalog): number[] {
  const ids: number[] = [];
  for (const index of indices) {
    const id = catalog.ids[index];
    if (id != null) ids.push(id);
  }
  return ids;
}

/** Map a versioned or legacy stored string to `Pos{n}` / FrameRequest ids. */
export function resolveStoredFileIds(
  positions: string,
  version: number | null | undefined,
  catalog: PositionCatalog,
): { ok: true; ids: number[]; indices: number[] } | { ok: false; error: string } {
  const migrated = migrateStoredPositions(positions, version, catalog);
  if (!migrated.ok) return migrated;
  const indices = expandStoredPositions(migrated.positions);
  return { ok: true, ids: fileIdsForIndices(indices, catalog), indices };
}

function labelNumber(label: string): number | null {
  return parseNonNegativeInteger(label);
}

function indicesForNumericLabelRange(
  start: number,
  end: number,
  catalog: PositionCatalog,
): number[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const indices: number[] = [];
  catalog.labels.forEach((label, index) => {
    const value = labelNumber(label);
    if (value != null && value >= lo && value <= hi) indices.push(index);
  });
  return indices;
}

function parseLabelToken(token: string, catalog: PositionCatalog): number[] | null {
  const trimmed = token.trim();
  const range = DISPLAY_RANGE.exec(trimmed);
  if (range) {
    const left = Number(range[1]);
    const right = Number(range[2]);
    const indices = indicesForNumericLabelRange(left, right, catalog);
    return indices.length > 0 ? indices : null;
  }
  if (DISPLAY_SINGLE.test(trimmed)) {
    const value = Number(trimmed);
    const indices = indicesForNumericLabelRange(value, value, catalog);
    if (indices.length > 0) return indices;
  }
  const exact = catalog.labels.findIndex((label) => label === trimmed);
  return exact >= 0 ? [exact] : null;
}

export type LabelPositionParse = {
  ranges: StoredPositionRange[];
  invalid: string;
};

/** Parse typed text against displayed labels only. */
export function parseLabelPositionList(raw: string, catalog: PositionCatalog): LabelPositionParse {
  const indices: number[] = [];
  const invalid: string[] = [];
  for (const token of raw.split(",")) {
    if (!token.trim()) continue;
    const matched = parseLabelToken(token, catalog);
    if (matched) indices.push(...matched);
    else invalid.push(token.trim());
  }
  const ranges = mergePositionRanges(indices.map((index) => ({ start: index, end: index })));
  return { ranges, invalid: invalid.join(", ") };
}

export function formatPositionChip(range: StoredPositionRange, catalog: PositionCatalog): string {
  const start = catalog.labels[range.start] ?? String(range.start);
  const end = catalog.labels[range.end] ?? String(range.end);
  return start === end ? start : `${start}–${end}`;
}

export function formatResolvedPreview(
  indices: readonly number[],
  catalog: PositionCatalog,
): string {
  if (catalog.ids.length === 0) return "No positions detected in this source.";
  if (indices.length === 0) return `0 of ${formatCatalogRange(catalog)} selected.`;
  const labels = indices
    .map((index) => catalog.labels[index])
    .filter((label): label is string => label != null);
  if (labels.length === 0) return `0 of ${formatCatalogRange(catalog)} selected.`;
  const prefix = catalog.kind === "folder" ? "Pos" : "";
  const first = labels[0];
  const last = labels[labels.length - 1];
  return `${indices.length} positions: ${prefix}${first} to ${prefix}${last}`;
}

export function toggleIndexInStored(stored: string, index: number, selected: boolean): string {
  const current = new Set(expandStoredPositions(stored));
  if (selected) current.add(index);
  else current.delete(index);
  return indicesToStored([...current].toSorted((left, right) => left - right));
}

export function storedIndexSet(stored: string): Set<number> {
  return new Set(expandStoredPositions(stored));
}

export function rangesFromStored(stored: string): StoredPositionRange[] {
  return storedPositionRanges(stored);
}

export function migrateSamplePositions<T extends { positions: string }>(
  samples: readonly T[],
  version: number | null | undefined,
  catalog: PositionCatalog,
): { ok: true; samples: T[] } | { ok: false; error: string } {
  const next: T[] = [];
  for (const row of samples) {
    const migrated = migrateStoredPositions(row.positions, version, catalog);
    if (!migrated.ok) return migrated;
    next.push({ ...row, positions: migrated.positions });
  }
  return { ok: true, samples: next };
}

/** Apply typed label text onto the stored 0-based index string. */
export function commitDisplayPositionDraft(
  stored: string,
  draft: string,
  commitTrailing: boolean,
  catalog: PositionCatalog,
): { positions: string; draft: string; invalid: boolean } {
  const split = splitDisplayDraft(draft, commitTrailing);
  const parsed = parseLabelPositionList(split.ready, catalog);
  const positions =
    parsed.ranges.length === 0
      ? formatStoredPositions(storedPositionRanges(stored))
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
