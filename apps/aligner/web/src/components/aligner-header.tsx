import { FolderSourceParseModal, HostFilePickerDialog, SourcePickerModal } from "@lisca/instrument";
import type { AlignerSource } from "@lisca/contracts";
import {
  forgetRecentSource,
  forgetRecentWorkspace,
  readRecentMemory,
  recentSourceByPath,
  recentSourcePickerItems,
  touchRecentMemory,
} from "@lisca/client/session/recent-memory";
import { ShellNavbar, useShellWorkspace, type ShellWorkspaceControlSession } from "@lisca/ui/shell";
import type { HostFilePickerMode } from "@lisca/instrument";
import { createSignal } from "solid-js";

import { alignerHostOperations } from "../api/aligner-port";
import { useAlignSource } from "../state/align-page-selectors";

function filePickerTitle(mode: HostFilePickerMode): string {
  if (mode === "workspace") return "Workspace folder";
  if (mode === "folder") return "Image folder";
  if (mode === "nd2_file") return "ND2 file";
  if (mode === "czi_file") return "CZI file";
  return "File";
}

/** Aligner shell header — no task center (crop tasks live in Studio / CLI). */
export function AlignerHeader() {
  const alignSource = useAlignSource();
  const workspace = useShellWorkspace();
  const lastRevisionByWorkspace = new Map<string, number>();
  let pickerMode: HostFilePickerMode | null = null;
  const [recentVersion, setRecentVersion] = createSignal(0);
  const [sourcePickerOpen, setSourcePickerOpen] = createSignal(false);
  const [folderSourcePath, setFolderSourcePath] = createSignal<string | null>(null);
  const [filePicker, setFilePicker] = createSignal<{
    open: boolean;
    mode: HostFilePickerMode;
    title: string;
  }>({ open: false, mode: "workspace", title: "" });

  // Each picker remembers its own recent picks; a recent pick sets only that field.
  const applyWorkspace = (path: string) => {
    workspace.setWorkspacePath(path);
    alignSource.setSource(null);
    touchRecentMemory("aligner", { kind: "workspace", path });
    setRecentVersion((version) => version + 1);
  };
  const applySource = (source: AlignerSource) => {
    workspace.setSourcePath(source.path);
    alignSource.setSource(source);
    touchRecentMemory("aligner", { kind: "source", source });
    setRecentVersion((version) => version + 1);
  };

  const handleAgentSessionsChange = (sessions: ShellWorkspaceControlSession[]) => {
    const current = sessions[0];
    if (!current) return;
    const previousRevision = lastRevisionByWorkspace.get(current.workspacePath);
    if (previousRevision === current.revision) return;
    lastRevisionByWorkspace.set(current.workspacePath, current.revision);
    void alignSource.refreshAgentWorkspace(current.workspacePath);
  };

  const openFilePicker = (mode: HostFilePickerMode) => {
    pickerMode = mode;
    setFilePicker({ open: true, mode, title: filePickerTitle(mode) });
  };

  const applyPickDirectory = (path: string) => {
    const mode = pickerMode;
    if (mode === "workspace") {
      applyWorkspace(path);
      return;
    }
    if (mode === "folder") {
      setFolderSourcePath(path);
    }
  };

  const applyPickFile = (path: string) => {
    const mode = pickerMode;
    if (mode === "nd2_file") applySource({ kind: "nd2", path });
    if (mode === "czi_file") applySource({ kind: "czi", path });
  };

  return (
    <>
      <ShellNavbar.Aligner
        appearance="stage"
        onAgentSessionsChange={handleAgentSessionsChange}
        onPickSource={() => setSourcePickerOpen(true)}
        onPickWorkspace={() => openFilePicker("workspace")}
      />

      <SourcePickerModal
        open={sourcePickerOpen()}
        onClose={() => setSourcePickerOpen(false)}
        onOpenCzi={() => openFilePicker("czi_file")}
        onOpenFolder={() => openFilePicker("folder")}
        onOpenNd2={() => openFilePicker("nd2_file")}
      />

      <FolderSourceParseModal
        hostPort={alignerHostOperations}
        path={folderSourcePath()}
        onClose={() => setFolderSourcePath(null)}
        onConfirm={(source) => {
          applySource(source);
          setFolderSourcePath(null);
        }}
      />

      <HostFilePickerDialog
        hostPort={alignerHostOperations}
        mode={filePicker().mode}
        open={filePicker().open}
        title={filePicker().title}
        onOpenChange={(open) => {
          setFilePicker((current) => ({ ...current, open }));
          if (!open) pickerMode = null;
        }}
        onPickDirectory={applyPickDirectory}
        onPickFile={applyPickFile}
        recentItems={
          filePicker().open
            ? (() => {
                recentVersion();
                const memory = readRecentMemory("aligner");
                return filePicker().mode === "workspace"
                  ? memory.workspaces
                  : recentSourcePickerItems(memory.sources, filePicker().mode);
              })()
            : undefined
        }
        onRemoveRecent={(path) => {
          const mode = filePicker().mode;
          if (mode === "workspace") {
            forgetRecentWorkspace("aligner", path);
          } else {
            forgetRecentSource("aligner", mode, path);
          }
          setRecentVersion((version) => version + 1);
        }}
        onPickRecent={(path) => {
          const mode = filePicker().mode;
          setFilePicker((current) => ({ ...current, open: false }));
          pickerMode = null;
          if (mode === "workspace") {
            applyWorkspace(path);
            return;
          }
          const source = recentSourceByPath(readRecentMemory("aligner").sources, mode, path);
          if (source) applySource(source);
          else if (mode === "folder") setFolderSourcePath(path);
          else if (mode === "nd2_file") applySource({ kind: "nd2", path });
          else if (mode === "czi_file") applySource({ kind: "czi", path });
        }}
      />
    </>
  );
}
