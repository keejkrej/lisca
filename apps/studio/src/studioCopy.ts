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
      return "Align the grid with the mouse, then press next to save bbox and advance.";
    default:
      return "";
  }
}
