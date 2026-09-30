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
    return "Open a saved assay, or pick an assay type and press New to start a blank one.";
  }
  if (step === "metadata") {
    return "Choose the image source, workspace folder, and time between frames. Name each sample and the positions it covers.";
  }
  if (step === "alignPattern") {
    return "Drag the grid onto the micropattern, exclude empty cells, then press Save. Once every position is saved, press Crop.";
  }
  return "Finish the Metadata step before aligning.";
}

export function instructionForAnnotate(): string {
  return "Pick a label, paint the site, then press Save. Press Analyze when every site is done.";
}
