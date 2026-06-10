import type { StudioAssayId } from "@lisca/contracts/assay";
import type { StudioBasicInfoStep1, StudioBasicInfoStep2, StudioBasicInfoStep3 } from "@lisca/contracts/assay";
import { validInfo1, validInfo2 } from "../state/studio-routes";
import { isValidSamplePositionRange } from "./sample-positions";

function parseNonNegativeInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
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
    errors.push("Complete basic info step 1 (name, date, data path, save location).");
  }
  if (!validInfo2(input.info2, input.assayId)) {
    errors.push("Complete basic info step 2 (pattern and timelapse interval).");
  }

  const activeSamples = input.info3.samplesBySlide[input.info3.selectedSlideId];
  if (activeSamples.length === 0) {
    errors.push("Add at least one sample row for the selected slide.");
  }

  activeSamples.forEach((row, index) => {
    const rowLabel = `Sample row ${index + 1}`;
    if (parseNonNegativeInteger(row.channel) == null) {
      errors.push(`${rowLabel}: channel must be a non-negative integer.`);
    }
    if (row.name.trim().length === 0) {
      errors.push(`${rowLabel}: sample name is required.`);
    }
    if (!isValidSamplePositionRange(row.positionStart, row.positionFinish)) {
      errors.push(
        `${rowLabel}: position start and finish must be positive integers with finish ≥ start (1-based).`,
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
