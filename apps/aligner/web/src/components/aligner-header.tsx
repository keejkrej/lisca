import {
  FolderSourceParseModal,
  HostFilePickerDialog,
  SourcePickerModal,
} from "@lisca/ui/features";
import type { AlignerSource } from "@lisca/contracts";
import { readRecentMemory, touchRecentMemory } from "@lisca/client/session/recent-memory";
import { ShellNavbar, useShellWorkspace } from "@lisca/ui/shell";
import type { HostFilePickerMode } from "@lisca/ui/features";
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
  let pickerMode: HostFilePickerMode | null = null;
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
  };
  const applySource = (source: AlignerSource) => {
    workspace.setSourcePath(source.path);
    alignSource.setSource(source);
    touchRecentMemory("aligner", { kind: "source", source });
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
        onPickSource={() => setSourcePickerOpen(true)}
        onPickWorkspace={() => openFilePicker("workspace")}
      />

      <SourcePickerModal
        open={sourcePickerOpen()}
        onClose={() => setSourcePickerOpen(false)}
        onOpenCzi={() => openFilePicker("czi_file")}
        onOpenFolder={() => openFilePicker("folder")}
        onOpenNd2={() => openFilePicker("nd2_file")}
        recentSources={sourcePickerOpen() ? readRecentMemory("aligner").sources : undefined}
        onPickRecentSource={applySource}
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
          filePicker().open && filePicker().mode === "workspace"
            ? readRecentMemory("aligner").workspaces
            : undefined
        }
        onPickRecent={(path) => {
          setFilePicker((current) => ({ ...current, open: false }));
          pickerMode = null;
          applyWorkspace(path);
        }}
      />
    </>
  );
}
