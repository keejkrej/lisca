import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AnnotationLabelSchema } from "@lisca/contracts";
import {
  forgetRecentWorkspace,
  readRecentMemory,
  touchRecentMemory,
} from "@lisca/client/session/recent-memory";
import { HostFilePickerDialog, LabelCreationDialog } from "@lisca/instrument";
import { AppShell } from "@lisca/ui/shell";
import { Schema } from "effect";

import { AnnotatePageContext, getAnnotateState } from "../state/annotate-page-context";
import { selectAnnotateShell } from "../state/annotate-page-selectors";
import { AnnotatorHeader } from "./annotator-header";
import { AnnotatorLeft } from "./annotator-left";
import { AnnotatorMain } from "./annotator-main";
import { AnnotatorRight } from "./annotator-right";

const AnnotatePageMessage = UiSchema.TaggedEnum({
  ChangedFilePickerOpen: { open: Schema.Boolean },
  PickedWorkspaceDirectory: { path: Schema.String },
  PickedWorkspaceFile: { path: Schema.String },
  PickedRecentWorkspace: { path: Schema.String },
  RemovedRecentWorkspace: { path: Schema.String },
  ChangedLabelDialogOpen: { open: Schema.Boolean },
  SavedLabels: { labels: Schema.Array(AnnotationLabelSchema) },
});

export const AnnotatePage = Html.component({
  name: "AnnotatePage",
  props: Schema.Struct({}),
  model: Schema.Struct({
    recentVersion: Schema.Number,
  }),
  message: AnnotatePageMessage,
  reads: {
    page: AnnotatePageContext,
  },
}).make({
  init: () => ({ recentVersion: 0 }),
  update: {
    ChangedFilePickerOpen: ($, { open }) => {
      const shell = selectAnnotateShell(() => getAnnotateState($.reads.page.controllerId));
      shell.setFilePickerOpen(open);
      return $.model;
    },
    PickedWorkspaceDirectory: ($, { path }) => {
      const shell = selectAnnotateShell(() => getAnnotateState($.reads.page.controllerId));
      shell.pickWorkspace(path);
      touchRecentMemory("annotator", { kind: "workspace", path });
      return $.evolve({ recentVersion: (version) => version + 1 });
    },
    PickedWorkspaceFile: ($) => $.model,
    PickedRecentWorkspace: ($, { path }) => {
      const shell = selectAnnotateShell(() => getAnnotateState($.reads.page.controllerId));
      shell.setFilePickerOpen(false);
      shell.pickWorkspace(path);
      touchRecentMemory("annotator", { kind: "workspace", path });
      return $.evolve({ recentVersion: (version) => version + 1 });
    },
    RemovedRecentWorkspace: ($, { path }) => {
      forgetRecentWorkspace("annotator", path);
      return $.evolve({ recentVersion: (version) => version + 1 });
    },
    ChangedLabelDialogOpen: ($, { open }) => {
      const shell = selectAnnotateShell(() => getAnnotateState($.reads.page.controllerId));
      shell.setLabelDialogOpen(open);
      return $.model;
    },
    SavedLabels: ($, { labels }) => {
      const shell = selectAnnotateShell(() => getAnnotateState($.reads.page.controllerId));
      void shell.handleSaveLabels([...labels]);
      return $.model;
    },
  },
  view: (h, model) => {
    void model.recentVersion;
    const shell = selectAnnotateShell(() => getAnnotateState(h.reads.page.controllerId));

    return h.div.class("h-full min-h-0").children(
      AppShell(h, {
        key: "app-shell",
        left: AnnotatorLeft(h, { key: "annotator-left", props: {} }),
        topBar: AnnotatorHeader(h, { key: "annotator-header", props: {} }),
        main: AnnotatorMain(h, { key: "annotator-main", props: {} }),
        right: AnnotatorRight(h, { key: "annotator-right", props: {} }),
      }),
      HostFilePickerDialog(h, {
        key: "workspace-picker",
        mode: "workspace",
        open: shell.filePickerOpen,
        title: "Workspace folder",
        onOpenChange: (open) => AnnotatePageMessage.ChangedFilePickerOpen({ open }),
        onPickDirectory: (path) => AnnotatePageMessage.PickedWorkspaceDirectory({ path }),
        onPickFile: (path) => AnnotatePageMessage.PickedWorkspaceFile({ path }),
        recentItems: shell.filePickerOpen ? readRecentMemory("annotator").workspaces : undefined,
        onRemoveRecent: (path) => AnnotatePageMessage.RemovedRecentWorkspace({ path }),
        onPickRecent: (path) => AnnotatePageMessage.PickedRecentWorkspace({ path }),
      }),
      LabelCreationDialog(h, {
        key: "label-dialog",
        error: shell.labelError,
        labels: shell.labels,
        open: shell.labelDialogOpen,
        saving: shell.saveLabelsPending,
        workspacePath: shell.workspacePath,
        onOpenChange: (open) => AnnotatePageMessage.ChangedLabelDialogOpen({ open }),
        onSave: (labels) => AnnotatePageMessage.SavedLabels({ labels }),
      }),
    );
  },
});
