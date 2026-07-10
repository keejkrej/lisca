import {
  FolderSourceParseModal,
  HostFilePickerDialog,
  SourcePickerModal,
} from "@lisca/ui/features";
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

  const openFilePicker = (mode: HostFilePickerMode) => {
    pickerMode = mode;
    setFilePicker({ open: true, mode, title: filePickerTitle(mode) });
  };

  const applyPickDirectory = (path: string) => {
    const mode = pickerMode;
    if (mode === "workspace") {
      workspace.setWorkspacePath(path);
      alignSource.setSource(null);
      return;
    }
    if (mode === "folder") {
      setFolderSourcePath(path);
    }
  };

  const applyPickFile = (path: string) => {
    const mode = pickerMode;
    if (mode === "nd2_file") {
      workspace.setSourcePath(path);
      alignSource.setSource({ kind: "nd2", path });
    }
    if (mode === "czi_file") {
      workspace.setSourcePath(path);
      alignSource.setSource({ kind: "czi", path });
    }
  };

  return (
    <>
      <ShellNavbar.Aligner
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
          workspace.setSourcePath(source.path);
          alignSource.setSource(source);
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
      />
    </>
  );
}