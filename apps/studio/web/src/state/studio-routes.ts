import type { StudioStep } from "./studio-store";
import {
  validAssayIdentity,
  validAssayInterval,
  validAssaySamples,
} from "@lisca/client/studio/assay-validation";

export { validAssayIdentity, validAssayInterval, validAssaySamples };
export { isValidSamplePositionRange } from "@lisca/client/studio/assay-validation";

export function instructionForStep(step: StudioStep): string {
  if (step === "chooseAssay") return "Choose an assay type.";
  if (step === "info1") {
    return "Set the data source, workspace output folder, and timelapse interval.";
  }
  if (step === "info2") {
    return "Define sample rows and position ranges used in align and annotate.";
  }
  if (step === "alignPattern") {
    return "Align the grid with the mouse for positions defined in basic info, then press Next to save bbox and advance.";
  }
  return "Complete basic info.";
}

export function instructionForAnnotate(): string {
  return "Annotate each adhesive site, save labels, then continue to analysis.";
}

export function defaultResultInstruction(
  section: "timeseries" | "parameters",
  assay: "transfection" | "killing" | "unknown" = "unknown",
): string {
  if (section === "timeseries") {
    return assay === "killing"
      ? "P(dead) traces for each position. The red line is the median."
      : "Intensity traces for each position. The red line is the median.";
  }
  return assay === "killing"
    ? "Kill curves overlay samples; death-time histograms share a time axis."
    : "Parameter plots: mRNA lifetime, AUC, expression rate, and onset time.";
}
