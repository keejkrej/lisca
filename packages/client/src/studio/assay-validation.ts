import type {
  StudioAssayId,
  StudioAssaySampleRow,
  StudioIntervalUnit,
} from "@lisca/contracts/assay";

import { isValidSamplePositionRange, parseSignalChannels } from "./sample-positions";

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

export function validAssaySamples(samples: StudioAssaySampleRow[]): boolean {
  return (
    samples.length > 0 &&
    samples.every(
      (row) =>
        parseNonNegativeInteger(row.slideChannel) != null &&
        row.name.trim().length > 0 &&
        isValidSamplePositionRange(row.positionStart, row.positionFinish) &&
        parseNonNegativeInteger(row.mask) != null &&
        parseSignalChannels(row.signal) != null,
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
}): AssayValidationResult {
  const errors: string[] = [];

  if (!input.assayId) {
    errors.push("Choose an assay type before starting analysis.");
  }
  if (!validAssayIdentity(input)) {
    errors.push("Complete the Info step (name, source, workspace).");
  }
  if (!validAssayInterval(input.intervalValue, input.intervalUnit)) {
    errors.push("Set a positive timelapse interval.");
  }

  if (input.samples.length === 0) {
    errors.push("Add at least one sample mapping.");
  }

  input.samples.forEach((row, index) => {
    const rowLabel = `Sample row ${index + 1}`;
    if (parseNonNegativeInteger(row.slideChannel) == null) {
      errors.push(`${rowLabel}: slide channel must be a non-negative integer.`);
    }
    if (row.name.trim().length === 0) {
      errors.push(`${rowLabel}: sample name is required.`);
    }
    if (!isValidSamplePositionRange(row.positionStart, row.positionFinish)) {
      errors.push(
        `${rowLabel}: position start and finish must be non-negative integers with finish >= start.`,
      );
    }
    if (parseNonNegativeInteger(row.mask) == null) {
      errors.push(`${rowLabel}: mask channel must be a non-negative integer.`);
    }
    if (parseSignalChannels(row.signal) == null) {
      errors.push(
        `${rowLabel}: signal must be a non-empty comma-separated list of non-negative integers.`,
      );
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

export { isValidSamplePositionRange } from "./sample-positions";

/** @deprecated Use validAssayIdentity */
export const validInfo1 = (info: { name: string; dataPath: string; saveTo: string }): boolean =>
  validAssayIdentity({
    name: info.name,
    dataPath: info.dataPath,
    workspacePath: info.saveTo,
  });
