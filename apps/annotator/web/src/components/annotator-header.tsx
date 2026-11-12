import { runClientEffect } from "@lisca/client/runtime";
import { InferenceSettingsPanel, type LabelFreeClient } from "@lisca/instrument";
import { ShellNavbar, type ShellWorkspaceControlSession } from "@lisca/ui/shell";

import { annotatorClient, toErrorMessage } from "../api/annotator-port";
import { useAnnotateShell } from "../state/annotate-page-selectors";

export const annotatorLabelFreeClient: LabelFreeClient = {
  health: () => runClientEffect(annotatorClient.labelFreeHealth()),
  saveKey: (apiKey, provider) =>
    runClientEffect(annotatorClient.saveLabelFreeKey(apiKey, provider)),
  listReferences: (workspacePath) =>
    runClientEffect(annotatorClient.listLabelFreeReferences(workspacePath)),
  buildReferences: (workspacePath, name) =>
    runClientEffect(annotatorClient.buildLabelFreeReferences(workspacePath, name)),
  classify: (workspacePath, name, limit) =>
    runClientEffect(annotatorClient.classifyLabelFree(workspacePath, name, limit)),
  formatError: toErrorMessage,
};

/** Annotator shell header. Crop and analysis tasks live in Studio, not here. */
export function AnnotatorHeader() {
  const shell = useAnnotateShell();
  const lastRevisionByWorkspace = new Map<string, number>();

  const handleAgentSessionsChange = (sessions: ShellWorkspaceControlSession[]) => {
    const current = sessions[0];
    if (!current) return;
    const previousRevision = lastRevisionByWorkspace.get(current.workspacePath);
    if (previousRevision === current.revision) return;
    lastRevisionByWorkspace.set(current.workspacePath, current.revision);
    void shell.refreshAgentWorkspace(current.workspacePath);
  };

  return (
    <ShellNavbar.Annotator
      appearance="stage"
      inferenceSlot={<InferenceSettingsPanel client={annotatorLabelFreeClient} />}
      onAgentSessionsChange={handleAgentSessionsChange}
      onPickWorkspace={() => shell.setFilePickerOpen(true)}
    />
  );
}
