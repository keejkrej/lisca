import type { StudioStep } from "./studioStore";

/** Command-bar instruction copy aligned with the LISCA Figma `instruction` layer. */
export function instructionForStep(step: StudioStep): string {
  switch (step) {
    case "welcome":
      return "pick assay type!";
    case "info1":
      return "enter study and run fields!";
    case "info2":
      return "add sample and readouts!";
    default:
      return "";
  }
}
