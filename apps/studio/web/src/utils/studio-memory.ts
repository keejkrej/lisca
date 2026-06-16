import type { AlignerSource } from "@lisca/contracts";
import { touchStudioWizardMemory } from "@lisca/client/studio/wizard-memory";

export function recordStudioWorkspaceMemory(path: string, label?: string): void {
  touchStudioWizardMemory({ kind: "workspace", path, label });
}

export function recordStudioSourceMemory(source: AlignerSource, label?: string): void {
  touchStudioWizardMemory({ kind: "source", source, label });
}

export function recordStudioAssayMemory(
  path: string,
  assayLabel?: string,
  workspacePath?: string,
): void {
  touchStudioWizardMemory({ kind: "assay", path, assayLabel, workspacePath });
}
