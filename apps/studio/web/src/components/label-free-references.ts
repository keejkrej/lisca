import { runClientEffect } from "@lisca/client/runtime";
import type { LabelFreeClient } from "@lisca/instrument";

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
