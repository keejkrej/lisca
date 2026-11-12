import { runClientEffect } from "@lisca/client/runtime";
import { LabelFreeReferencesPanel, type LabelFreeClient } from "@lisca/instrument";

import { studioClient, toErrorMessage } from "../api/studio-port";

export const studioLabelFreeClient: LabelFreeClient = {
  health: () => runClientEffect(studioClient.labelFreeHealth()),
  saveKey: (apiKey, provider) => runClientEffect(studioClient.saveLabelFreeKey(apiKey, provider)),
  listReferences: (workspacePath) =>
    runClientEffect(studioClient.listLabelFreeReferences(workspacePath)),
  buildReferences: (workspacePath, name) =>
    runClientEffect(studioClient.buildLabelFreeReferences(workspacePath, name)),
  classify: (workspacePath, name, limit) =>
    runClientEffect(studioClient.classifyLabelFree(workspacePath, name, limit)),
  formatError: toErrorMessage,
};

export function LabelFreeReferences(props: { workspacePath: string | null }) {
  return (
    <LabelFreeReferencesPanel client={studioLabelFreeClient} workspacePath={props.workspacePath} />
  );
}
