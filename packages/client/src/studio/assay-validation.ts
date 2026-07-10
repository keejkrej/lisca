import type {
  StudioAssayId,
  StudioBasicInfoStep1,
  StudioBasicInfoStep2,
  StudioBasicInfoStep3,
} from "@lisca/contracts/assay";
import { ASSAY_TYPE } from "@lisca/contracts/assay";

import { isValidSamplePositionRange } from "./sample-positions";

function parseNonNegativeInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function validInfo1(info1: StudioBasicInfoStep1): boolean {
  return (
    info1.name.trim().length > 0 &&
    info1.dataPath.trim().length > 0 &&
    info1.saveTo.trim().length > 0
  );
}

export function validInfo2(info2: StudioBasicInfoStep2, assayId: StudioAssayId | null): boolean {
  return (
    info2.timelapseAmount != null &&
    info2.timelapseAmount > 0 &&
    (assayId !== ASSAY_TYPE.GENE_EXPRESSION ||
      (Array.isArray(info2.selectedFeatures) && info2.selectedFeatures.length > 0))
  );
}

export function validInfo3(info3: StudioBasicInfoStep3): boolean {
  const samples = info3.samples;
  return (
    samples.length > 0 &&
    samples.every(
      (row) =>
        parseNonNegativeInteger(row.channel) != null &&
        row.name.trim().length > 0 &&
        isValidSamplePositionRange(row.positionStart, row.positionFinish) &&
        parseNonNegativeInteger(row.maskChannel) != null &&
        parseNonNegativeInteger(row.signalChannel) != null,
    )
  );
}

export type AssayValidationResult = { ok: true } | { ok: false; errors: string[] };

export function validateAssayForAnalysis(input: {
  assayId: StudioAssayId | null;
  info1: StudioBasicInfoStep1;
  info2: StudioBasicInfoStep2;
  info3: StudioBasicInfoStep3;
}): AssayValidationResult {
  const errors: string[] = [];

  if (!input.assayId) {
    errors.push("Choose an assay type before starting analysis.");
  }
  if (!validInfo1(input.info1)) {
    errors.push("Complete basic info step 1 (name, source, workspace).");
  }
  if (!validInfo2(input.info2, input.assayId)) {
    errors.push("Complete basic info step 1 (timelapse interval).");
  }

  const samples = input.info3.samples;
  if (samples.length === 0) {
    errors.push("Add at least one sample mapping.");
  }

  samples.forEach((row, index) => {
    const rowLabel = `Sample row ${index + 1}`;
    if (parseNonNegativeInteger(row.channel) == null) {
      errors.push(`${rowLabel}: channel must be a non-negative integer.`);
    }
    if (row.name.trim().length === 0) {
      errors.push(`${rowLabel}: sample name is required.`);
    }
    if (!isValidSamplePositionRange(row.positionStart, row.positionFinish)) {
      errors.push(
        `${rowLabel}: position start and finish must be positive integers with finish >= start (1-based).`,
      );
    }
    if (parseNonNegativeInteger(row.maskChannel) == null) {
      errors.push(`${rowLabel}: mask channel must be a non-negative integer.`);
    }
    if (parseNonNegativeInteger(row.signalChannel) == null) {
      errors.push(`${rowLabel}: signal channel must be a non-negative integer.`);
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

export { isValidSamplePositionRange } from "./sample-positions";
