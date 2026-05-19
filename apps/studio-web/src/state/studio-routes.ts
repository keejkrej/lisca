import type {
  AssayId,
  BasicInfoStep1,
  BasicInfoStep2,
  BasicInfoStep3,
  StudioStep,
} from "./studio-store";
import { ASSAY_NAME } from "@lisca/contracts";

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
        row.channel.trim().length > 0 &&
        row.name.trim().length > 0 &&
        row.positions.trim().length > 0 &&
        row.maskChannel.trim().length > 0 &&
        row.signalChannel.trim().length > 0,
    )
  );
}

export function instructionForStep(step: StudioStep): string {
  if (step === "chooseAssay") return "Choose an assay type.";
  if (step === "alignPattern") {
    return "Align the grid with the mouse, then press Next to save bbox and advance.";
  }
  return "Complete basic info.";
}
