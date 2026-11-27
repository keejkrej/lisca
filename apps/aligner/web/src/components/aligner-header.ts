import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  forgetRecentSource,
  forgetRecentWorkspace,
  readRecentMemory,
  recentSourceByPath,
  recentSourcePickerItems,
  touchRecentMemory,
} from "@lisca/client/session/recent-memory";
import { FolderSourceSchema, type AlignerSource, type MemorySourceEntry } from "@lisca/contracts";
import {
  FolderSourceParseModal,
  HostFilePickerDialog,
  SourcePickerModal,
  type HostFilePickerMode,
} from "@lisca/instrument";
import {
  ShellNavbar,
  ShellWorkspaceControlSessionSchema,
  ShellWorkspaceProvider,
  ShellWorkspaceReceives,
} from "@lisca/ui/shell";
import { Schema } from "effect";

import { AlignPageStore, getAlignerState } from "../state/align-page-context";

const HostFilePickerModeSchema = Schema.Literals([
  "workspace",
  "folder",
  "nd2_file",
  "czi_file",
  "assay_json_file",
]);

function filePickerTitle(mode: HostFilePickerMode): string {
  if (mode === "workspace") return "Workspace folder";
  if (mode === "folder") return "Image folder";
  if (mode === "nd2_file") return "ND2 file";
  if (mode === "czi_file") return "CZI file";
  return "File";
}

function toRecentSourceRefs(sources: readonly MemorySourceEntry[]) {
  return sources.map((entry) =>
    entry.label !== undefined
      ? { source: entry.source, label: entry.label }
      : { source: entry.source },
  );
}

const AlignerHeaderMessage = UiSchema.TaggedEnum({
  OpenSourcePicker: {},
  CloseSourcePicker: {},
  OpenFilePicker: { mode: HostFilePickerModeSchema },
  FilePickerOpenChanged: { open: Schema.Boolean },
  PickedDirectory: { path: Schema.String },
  PickedFile: { path: Schema.String },
  PickedRecent: { path: Schema.String },
  RemovedRecent: { path: Schema.String },
  CloseFolderParse: {},
  ConfirmedFolderSource: { source: FolderSourceSchema },
  AgentSessionsChanged: { sessions: Schema.Array(ShellWorkspaceControlSessionSchema) },
});

/** Aligner shell header — no task center (crop tasks live in Studio / CLI). */
export const AlignerHeader = Html.component({
  name: "AlignerHeader",
  props: Schema.Struct({}),
  model: Schema.Struct({
    recentVersion: Schema.Number,
    sourcePickerOpen: Schema.Boolean,
    folderSourcePath: Schema.NullOr(Schema.String),
    filePickerOpen: Schema.Boolean,
    filePickerMode: HostFilePickerModeSchema,
    filePickerTitle: Schema.String,
    activePickerMode: Schema.NullOr(HostFilePickerModeSchema),
    lastRevisionByWorkspace: Schema.Record(Schema.String, Schema.Number),
  }),
  message: AlignerHeaderMessage,
  reads: {
    alignPage: AlignPageStore,
    workspace: ShellWorkspaceProvider,
  },
}).make({
  init: () => ({
    recentVersion: 0,
    sourcePickerOpen: false,
    folderSourcePath: null,
    filePickerOpen: false,
    filePickerMode: "workspace" as const,
    filePickerTitle: "",
    activePickerMode: null,
    lastRevisionByWorkspace: {},
  }),
  update: {
    OpenSourcePicker: ($) => $.evolve({ sourcePickerOpen: true }),
    CloseSourcePicker: ($) => $.evolve({ sourcePickerOpen: false }),
    OpenFilePicker: ($, { mode }) =>
      $.evolve({
        sourcePickerOpen: false,
        filePickerOpen: true,
        filePickerMode: mode,
        filePickerTitle: filePickerTitle(mode),
        activePickerMode: mode,
      }),
    FilePickerOpenChanged: ($, { open }) =>
      $.evolve({
        filePickerOpen: open,
        activePickerMode: open ? $.model.activePickerMode : null,
      }),
    PickedDirectory: ($, { path }) => {
      const mode = $.model.activePickerMode;
      if (mode === "workspace") {
        const alignState = getAlignerState($.reads.alignPage.controllerId);
        alignState?.setSource(null);
        touchRecentMemory("aligner", { kind: "workspace", path });
        return $.evolve({ recentVersion: (v) => v + 1 }).send(
          ShellWorkspaceProvider,
          ShellWorkspaceReceives.SetWorkspacePath({ path }),
        );
      }
      if (mode === "folder") {
        return $.evolve({ folderSourcePath: path });
      }
      return $.model;
    },
    PickedFile: ($, { path }) => {
      const mode = $.model.activePickerMode;
      const source: AlignerSource | null =
        mode === "nd2_file"
          ? { kind: "nd2", path }
          : mode === "czi_file"
            ? { kind: "czi", path }
            : null;
      if (!source) return $.model;
      const alignState = getAlignerState($.reads.alignPage.controllerId);
      alignState?.setSource(source);
      touchRecentMemory("aligner", { kind: "source", source });
      return $.evolve({ recentVersion: (v) => v + 1 }).send(
        ShellWorkspaceProvider,
        ShellWorkspaceReceives.SetSourcePath({ path: source.path }),
      );
    },
    PickedRecent: ($, { path }) => {
      const mode = $.model.filePickerMode;
      const closed = $.evolve({ filePickerOpen: false, activePickerMode: null });
      if (mode === "workspace") {
        const alignState = getAlignerState($.reads.alignPage.controllerId);
        alignState?.setSource(null);
        touchRecentMemory("aligner", { kind: "workspace", path });
        return closed
          .evolve({ recentVersion: (v) => v + 1 })
          .send(ShellWorkspaceProvider, ShellWorkspaceReceives.SetWorkspacePath({ path }));
      }
      const remembered = recentSourceByPath(
        toRecentSourceRefs(readRecentMemory("aligner").sources),
        mode,
        path,
      );
      if (remembered) {
        const alignState = getAlignerState($.reads.alignPage.controllerId);
        alignState?.setSource(remembered);
        touchRecentMemory("aligner", { kind: "source", source: remembered });
        return closed
          .evolve({ recentVersion: (v) => v + 1 })
          .send(
            ShellWorkspaceProvider,
            ShellWorkspaceReceives.SetSourcePath({ path: remembered.path }),
          );
      }
      if (mode === "folder") {
        return closed.evolve({ folderSourcePath: path });
      }
      if (mode === "nd2_file" || mode === "czi_file") {
        const source: AlignerSource =
          mode === "nd2_file" ? { kind: "nd2", path } : { kind: "czi", path };
        const alignState = getAlignerState($.reads.alignPage.controllerId);
        alignState?.setSource(source);
        touchRecentMemory("aligner", { kind: "source", source });
        return closed
          .evolve({ recentVersion: (v) => v + 1 })
          .send(
            ShellWorkspaceProvider,
            ShellWorkspaceReceives.SetSourcePath({ path: source.path }),
          );
      }
      return closed;
    },
    RemovedRecent: ($, { path }) => {
      const mode = $.model.filePickerMode;
      if (mode === "workspace") {
        forgetRecentWorkspace("aligner", path);
      } else {
        forgetRecentSource("aligner", mode, path);
      }
      return $.evolve({ recentVersion: (v) => v + 1 });
    },
    CloseFolderParse: ($) => $.evolve({ folderSourcePath: null }),
    ConfirmedFolderSource: ($, { source }) => {
      const alignState = getAlignerState($.reads.alignPage.controllerId);
      alignState?.setSource(source);
      touchRecentMemory("aligner", { kind: "source", source });
      return $.evolve({
        folderSourcePath: null,
        recentVersion: (v) => v + 1,
      }).send(ShellWorkspaceProvider, ShellWorkspaceReceives.SetSourcePath({ path: source.path }));
    },
    AgentSessionsChanged: ($, { sessions }) => {
      const current = sessions[0];
      if (!current) return $.model;
      if ($.model.lastRevisionByWorkspace[current.workspacePath] === current.revision) {
        return $.model;
      }
      const alignState = getAlignerState($.reads.alignPage.controllerId);
      if (alignState) {
        void alignState.refreshAgentWorkspace(current.workspacePath);
      }
      return $.evolve({
        lastRevisionByWorkspace: {
          ...$.model.lastRevisionByWorkspace,
          [current.workspacePath]: current.revision,
        },
      });
    },
  },
  view: (h, model) => {
    const recentItems = model.filePickerOpen
      ? (() => {
          void model.recentVersion;
          const memory = readRecentMemory("aligner");
          return model.filePickerMode === "workspace"
            ? memory.workspaces
            : recentSourcePickerItems(toRecentSourceRefs(memory.sources), model.filePickerMode);
        })()
      : undefined;

    return h.div.class("contents").children(
      ShellNavbar.Aligner(h, {
        key: "aligner-navbar",
        appearance: "stage",
        onAgentSessionsChange: (sessions) =>
          AlignerHeaderMessage.AgentSessionsChanged({ sessions }),
        onPickSource: AlignerHeaderMessage.OpenSourcePicker(),
        onPickWorkspace: AlignerHeaderMessage.OpenFilePicker({ mode: "workspace" }),
      }),
      SourcePickerModal(h, {
        key: "source-picker-modal",
        open: model.sourcePickerOpen,
        onClose: AlignerHeaderMessage.CloseSourcePicker(),
        onOpenCzi: AlignerHeaderMessage.OpenFilePicker({ mode: "czi_file" }),
        onOpenFolder: AlignerHeaderMessage.OpenFilePicker({ mode: "folder" }),
        onOpenNd2: AlignerHeaderMessage.OpenFilePicker({ mode: "nd2_file" }),
      }),
      FolderSourceParseModal(h, {
        key: "folder-source-parse-modal",
        path: model.folderSourcePath,
        onClose: AlignerHeaderMessage.CloseFolderParse(),
        onConfirm: (source) => AlignerHeaderMessage.ConfirmedFolderSource({ source }),
      }),
      HostFilePickerDialog(h, {
        key: "host-file-picker-dialog",
        mode: model.filePickerMode,
        open: model.filePickerOpen,
        title: model.filePickerTitle,
        onOpenChange: (open) => AlignerHeaderMessage.FilePickerOpenChanged({ open }),
        onPickDirectory: (path) => AlignerHeaderMessage.PickedDirectory({ path }),
        onPickFile: (path) => AlignerHeaderMessage.PickedFile({ path }),
        recentItems,
        onRemoveRecent: (path) => AlignerHeaderMessage.RemovedRecent({ path }),
        onPickRecent: (path) => AlignerHeaderMessage.PickedRecent({ path }),
      }),
    );
  },
});
