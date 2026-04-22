import type { StudioStep } from "./studioStore";

/** Command-bar instruction copy aligned with the LISCA Figma `instruction` layer. */
export function instructionForStep(step: StudioStep): string {
  switch (step) {
    case "welcome":
      return "pick the assay type!";
    case "info1":
      return "more assay info!";
    case "info2":
      return "more assay info!";
    case "alignPattern":
      return "";
    default:
      return "";
  }
}
