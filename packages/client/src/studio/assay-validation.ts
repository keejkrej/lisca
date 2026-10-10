import type {
  StudioAssayId,
  StudioAssaySampleRow,
  StudioIntervalUnit,
} from "@lisca/contracts/assay";

import { isValidStoredPositions, parseSignalChannels } from "./sample-positions";

function parseNonNegativeInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function validAssayIdentity(input: {
  name: string;
  dataPath: string;
  workspacePath: string;
}): boolean {
  return (
    input.name.trim().length > 0 &&
    input.dataPath.trim().length > 0 &&
    input.workspacePath.trim().length > 0
  );
}

export function validAssayInterval(
  intervalValue: number | null,
  _unit: StudioIntervalUnit,
): boolean {
  return intervalValue != null && intervalValue > 0;
}

/** Trimmed sample names that appear on more than one row, in first-seen order. */
export function duplicateSampleNames(samples: readonly { name: string }[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of samples) {
    const name = row.name.trim();
    if (!name) continue;
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates];
}

function validChannelOverride(value: string, parse: (raw: string) => unknown): boolean {
  return value.trim() === "" || parse(value) != null;
}

export function validAssayChannels(channels: { segmentation: string; signal: string }): boolean {
  return (
    parseNonNegativeInteger(channels.segmentation) != null &&
    parseSignalChannels(channels.signal) != null
  );
}

export function validAssaySamples(
  samples: StudioAssaySampleRow[],
  channels: { segmentation: string; signal: string },
): boolean {
  return (
    validAssayChannels(channels) &&
    samples.length > 0 &&
    duplicateSampleNames(samples).length === 0 &&
    samples.every(
      (row) =>
        row.name.trim().length > 0 &&
        isValidStoredPositions(row.positions) &&
        validChannelOverride(row.segmentation, parseNonNegativeInteger) &&
        validChannelOverride(row.signal, parseSignalChannels),
    )
  );
}

export type AssayValidationResult = { ok: true } | { ok: false; errors: string[] };

export function validateAssayForAnalysis(input: {
  assayId: StudioAssayId | null;
  name: string;
  dataPath: string;
  workspacePath: string;
  intervalValue: number | null;
  intervalUnit: StudioIntervalUnit;
  samples: StudioAssaySampleRow[];
  segmentationChannel: string;
  signalChannel: string;
}): AssayValidationResult {
  const errors: string[] = [];

  if (!input.assayId) {
    errors.push("Choose an assay type before starting analysis.");
  }
  if (!validAssayIdentity(input)) {
    errors.push("Complete the Metadata step (name, source, workspace).");
  }
  if (!validAssayInterval(input.intervalValue, input.intervalUnit)) {
    errors.push("Set a positive timelapse interval.");
  }

  if (input.samples.length === 0) {
    errors.push("Add at least one sample mapping.");
  }

  input.samples.forEach((row, index) => {
    const rowLabel = `Sample row ${index + 1}`;
    if (row.name.trim().length === 0) {
      errors.push(`${rowLabel}: sample name must be non-empty.`);
    }
    if (!isValidStoredPositions(row.positions)) {
      errors.push(
        `${rowLabel}: positions must be whole numbers from 1. Separate ranges with a comma.`,
      );
    }
    if (!validChannelOverride(row.segmentation, parseNonNegativeInteger)) {
      errors.push(`${rowLabel}: segmentation channel override must be a non-negative integer.`);
    }
    if (!validChannelOverride(row.signal, parseSignalChannels)) {
      errors.push(
        `${rowLabel}: signal channel override must be a non-empty comma-separated list of non-negative integers.`,
      );
    }
  });

  if (parseNonNegativeInteger(input.segmentationChannel) == null) {
    errors.push("Segmentation channel must be a non-negative integer.");
  }
  if (parseSignalChannels(input.signalChannel) == null) {
    errors.push(
      "Signal channel must be a non-empty comma-separated list of non-negative integers.",
    );
  }

  for (const name of duplicateSampleNames(input.samples)) {
    errors.push(`Sample name "${name}" is used by more than one sample; names must be unique.`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

export { isValidStoredPositions } from "./sample-positions";

/** @deprecated Use validAssayIdentity */
export const validInfo1 = (info: { name: string; dataPath: string; saveTo: string }): boolean =>
  validAssayIdentity({
    name: info.name,
    dataPath: info.dataPath,
    workspacePath: info.saveTo,
  });
