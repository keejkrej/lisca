import type { StudioStep } from "./studio-store";
import {
  validAssayIdentity,
  validAssayInterval,
  validAssaySamples,
} from "@lisca/client/studio/assay-validation";

export { validAssayIdentity, validAssayInterval, validAssaySamples };
export { isValidStoredPositions } from "@lisca/client/studio/assay-validation";

export function instructionForStep(step: StudioStep): string {
  if (step === "chooseAssay") {
    return "Open a saved assay, or pick an assay type and press New to start a blank one.";
  }
  if (step === "metadata") {
    return "Choose the image source, output folder, and time between frames. Set the segmentation and signal channels, then name each sample and the positions it covers. Press Save, then open Align in the left rail.";
  }
  if (step === "alignPattern") {
    return "Drag the grid onto the micropattern. Exclude empty patterns and any pattern with more than one cell. Save each position, then Crop. Expert mode adds Position, Z, Geometry, and Drift (key frames for drift correction).";
  }
  return "Finish the Metadata step before aligning.";
}

export function instructionForAnnotate(): string {
  return "Pick a class and paint the ROI mask if you need a hand-drawn foreground. Analysis measures every cropped ROI; annotations label cells, they do not drop unpainted ones. Skip segmentation on Metadata uses the full crop instead of a mask. Expert mode adds Position, ROI, and Z. Press Analyze when the crop is done.";
}
