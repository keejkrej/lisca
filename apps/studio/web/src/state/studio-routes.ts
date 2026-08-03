import type { StudioStep } from "./studio-store";
import {
  validInfo1,
  validInfo2,
  validInfo3,
} from "@lisca/client/studio/assay-validation";

export { validInfo1, validInfo2, validInfo3 };
export { isValidSamplePositionRange } from "@lisca/client/studio/assay-validation";

export function instructionForStep(step: StudioStep): string {
  if (step === "chooseAssay") return "Choose an assay type.";
  if (step === "info1") {
    return "Set the data source, workspace output folder, timelapse interval, and assay features.";
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

export function defaultResultInstruction(section: "timeseries" | "parameters"): string {
  return section === "timeseries"
    ? "All timeseries plots are shown below."
    : "Parameter plots: mRNA lifetime, AUC, expression rate, and onset time.";
}
