import type {
  AssayId,
  BasicInfoStep1,
  BasicInfoStep2,
  BasicInfoStep3,
  StudioStep,
} from "./studio-store";
import { ASSAY_NAME } from "@lisca/contracts";
import { isValidSamplePositionRange } from "../utils/sample-positions";

function parseNonNegativeInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function validInfo1(info1: BasicInfoStep1): boolean {
  return (
    info1.name.trim().length > 0 &&
    info1.date.trim().length > 0 &&
    info1.dataPath.trim().length > 0 &&
    info1.saveTo.trim().length > 0
  );
}

export function validInfo2(info2: BasicInfoStep2, assayId: AssayId | null): boolean {
  return (
    info2.pattern.trim().length > 0 &&
    info2.timelapseAmount != null &&
    info2.timelapseAmount > 0 &&
    (assayId !== ASSAY_NAME.GENE_EXPRESSION ||
      (Array.isArray(info2.selectedFeatures) && info2.selectedFeatures.length > 0))
  );
}

export function validInfo3(info3: BasicInfoStep3): boolean {
  const activeSamples = info3.samplesBySlide[info3.selectedSlideId];
  return (
    activeSamples.length > 0 &&
    activeSamples.every(
      (row) =>
        parseNonNegativeInteger(row.channel) != null &&
        row.name.trim().length > 0 &&
        isValidSamplePositionRange(row.positionStart, row.positionFinish) &&
        parseNonNegativeInteger(row.maskChannel) != null &&
        parseNonNegativeInteger(row.signalChannel) != null,
    )
  );
}

export function instructionForStep(step: StudioStep): string {
  if (step === "chooseAssay") return "Choose an assay type.";
  if (step === "alignPattern") {
    return "Align the grid with the mouse for positions defined in basic info, then press Next to save bbox and advance.";
  }
  return "Complete basic info.";
}
