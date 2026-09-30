import type { AlignerSource } from "@lisca/contracts";
import type { StudioAssayJson } from "@lisca/contracts/assay";
import { toStudioSource } from "@lisca/client/studio/source";
import { assayDisplayLabel } from "@lisca/client/studio-assay-json";
import { touchStudioWizardMemory } from "@lisca/client/studio/wizard-memory";

export function recordStudioWorkspaceMemory(path: string, label?: string): void {
  touchStudioWizardMemory({ kind: "workspace", path, label });
}

export function recordStudioSourceMemory(source: AlignerSource, label?: string): void {
  touchStudioWizardMemory({ kind: "source", source, label });
}

/**
 * Remember an opened or saved assay, plus its workspace and source, so the
 * workspace and source pickers of a new assay offer them too.
 */
export function recordStudioAssayMemory(assayJsonPath: string, assayJson: StudioAssayJson): void {
  const label = assayDisplayLabel(assayJson);
  const workspacePath = assayJson.workspace.path.trim();
  touchStudioWizardMemory({
    kind: "assay",
    path: assayJsonPath,
    assayLabel: label,
    workspacePath: workspacePath || undefined,
  });
  if (workspacePath) recordStudioWorkspaceMemory(workspacePath, label);
  const source = toStudioSource({
    kind: assayJson.data.type,
    dataPath: assayJson.data.path,
    folderTemplate:
      assayJson.data.type === "folder"
        ? {
            subfolder: assayJson.data.template.subfolder,
            filename: assayJson.data.template.filename,
          }
        : undefined,
  });
  if (source) recordStudioSourceMemory(source);
}
