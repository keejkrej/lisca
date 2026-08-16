import type { StudioStep } from "./studio-store";
import {
  validAssayIdentity,
  validAssayInterval,
  validAssaySamples,
} from "@lisca/client/studio/assay-validation";

export { validAssayIdentity, validAssayInterval, validAssaySamples };
export { isValidSamplePositionRange } from "@lisca/client/studio/assay-validation";

export function instructionForStep(step: StudioStep): string {
  if (step === "chooseAssay") {
    return "Pick an assay to set up, or open an existing one.";
  }
  if (step === "info1") {
    return "Choose the image source, workspace folder, and time between frames.";
  }
  if (step === "info2") {
    return "Name each sample and the microscope positions it covers. Align and Annotate use these ranges.";
  }
  if (step === "alignPattern") {
    return "Drag the grid onto the micropattern for each position, then press Next to save and continue.";
  }
  return "Finish the Info step before aligning.";
}

export function instructionForAnnotate(): string {
  return "Pick a label, paint the site, then continue.";
}
