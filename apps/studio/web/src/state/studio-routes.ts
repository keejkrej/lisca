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
  if (step === "metadata") {
    return "Choose the image source, workspace folder, and time between frames. Name each sample and the positions it covers.";
  }
  if (step === "alignPattern") {
    return "Drag the grid onto the micropattern, exclude empty patterns, then press Save. Continue moves to the next unsaved position.";
  }
  return "Finish the Metadata step before aligning.";
}

export function instructionForAnnotate(): string {
  return "Pick a label, paint the ROI, then continue.";
}
