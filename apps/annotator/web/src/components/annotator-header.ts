import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { runClientEffect } from "@lisca/client/runtime";
import { InferenceSettingsPanel, type LabelFreeClient } from "@lisca/instrument";
import {
  ShellNavbar,
  ShellWorkspaceControlSessionSchema,
  type ShellWorkspaceControlSession,
} from "@lisca/ui/shell";
import { Schema } from "effect";

import { annotatorClient, toErrorMessage } from "../api/annotator-port";
import { AnnotatePageContext, getAnnotateState } from "../state/annotate-page-context";
import { selectAnnotateShell } from "../state/annotate-page-selectors";

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

const lastRevisionByController = new Map<string, Map<string, number>>();

function trackAgentSessions(
  controllerId: string,
  sessions: readonly ShellWorkspaceControlSession[],
): ShellWorkspaceControlSession | null {
  const current = sessions[0];
  if (!current) return null;
  let revisions = lastRevisionByController.get(controllerId);
  if (!revisions) {
    revisions = new Map<string, number>();
    lastRevisionByController.set(controllerId, revisions);
  }
  const previousRevision = revisions.get(current.workspacePath);
  if (previousRevision === current.revision) return null;
  revisions.set(current.workspacePath, current.revision);
  return current;
}

const AnnotatorHeaderMessage = UiSchema.TaggedEnum({
  ClickedPickWorkspace: {},
  ChangedAgentSessions: { sessions: Schema.Array(ShellWorkspaceControlSessionSchema) },
});

/** Annotator shell header. Crop and analysis tasks live in Studio, not here. */
export const AnnotatorHeader = Html.component({
  name: "AnnotatorHeader",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AnnotatorHeaderMessage,
  reads: {
    page: AnnotatePageContext,
  },
}).make({
  init: () => ({}),
  update: {
    ClickedPickWorkspace: ($) => {
      const shell = selectAnnotateShell(() => getAnnotateState($.reads.page.controllerId));
      shell.setFilePickerOpen(true);
      return $.model;
    },
    ChangedAgentSessions: ($, { sessions }) => {
      const updated = trackAgentSessions($.reads.page.controllerId, sessions);
      if (updated) {
        const shell = selectAnnotateShell(() => getAnnotateState($.reads.page.controllerId));
        void shell.refreshAgentWorkspace(updated.workspacePath);
      }
      return $.model;
    },
  },
  view: (h) =>
    ShellNavbar.Annotator(h, {
      appearance: "stage",
      inferenceSlot: InferenceSettingsPanel(h, { key: "inference-settings", props: {} }),
      onAgentSessionsChange: (sessions) =>
        AnnotatorHeaderMessage.ChangedAgentSessions({ sessions }),
      onPickWorkspace: AnnotatorHeaderMessage.ClickedPickWorkspace(),
    }),
});
