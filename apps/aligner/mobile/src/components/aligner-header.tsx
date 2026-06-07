import {
  Button,
  FolderSourceParseModal,
  HostFilePickerDialog,
  ShellNavbar,
  SourcePickerModal,
  useShellWorkspace,
} from "@lisca/ui-native";
import type { AlignerSource, HostFilePickerMode } from "@lisca/contracts";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { alignerHostOperations } from "../api/aligner-port";

function filePickerTitle(mode: HostFilePickerMode): string {
  if (mode === "workspace") return "Workspace folder";
  if (mode === "folder") return "Image folder";
  if (mode === "nd2_file") return "ND2 file";
  if (mode === "czi_file") return "CZI file";
  return "File";
}

function ToolsMenuPlaceholder() {
  return <Button compact label="Tools" size="sm" variant="outline" disabled />;
}

export function AlignerHeader(props: { onSourcePicked: (source: AlignerSource | null) => void }) {
  const workspace = useShellWorkspace();
  const pickerModeRef = useRef<HostFilePickerMode | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [folderSourcePath, setFolderSourcePath] = useState<string | null>(null);
  const [filePicker, setFilePicker] = useState<{
    open: boolean;
    mode: HostFilePickerMode;
    title: string;
  }>({ open: false, mode: "workspace", title: "" });

  const openFilePicker = (mode: HostFilePickerMode) => {
    pickerModeRef.current = mode;
    setFilePicker({ open: true, mode, title: filePickerTitle(mode) });
  };

  const applyPickDirectory = (path: string) => {
    const mode = pickerModeRef.current;
    if (mode === "workspace") {
      workspace.setWorkspacePath(path);
      props.onSourcePicked(null);
      return;
    }
    if (mode === "folder") setFolderSourcePath(path);
  };

  const applyPickFile = (path: string) => {
    const mode = pickerModeRef.current;
    if (mode === "nd2_file") {
      workspace.setSourcePath(path);
      props.onSourcePicked({ kind: "nd2", path });
    }
    if (mode === "czi_file") {
      workspace.setSourcePath(path);
      props.onSourcePicked({ kind: "czi", path });
    }
  };

  return (
    <>
      <View style={styles.root}>
        <ShellNavbar
          endLeading={<ToolsMenuPlaceholder />}
          routeItems={[{ value: "align", label: "Align" }]}
          routeValue="align"
          showRouteToggle={false}
          onPickSource={() => setSourcePickerOpen(true)}
          onPickWorkspace={() => openFilePicker("workspace")}
          onRouteChange={() => undefined}
        />
      </View>
      <SourcePickerModal
        open={sourcePickerOpen}
        onClose={() => setSourcePickerOpen(false)}
        onOpenCzi={() => openFilePicker("czi_file")}
        onOpenFolder={() => openFilePicker("folder")}
        onOpenNd2={() => openFilePicker("nd2_file")}
      />
      <FolderSourceParseModal
        hostPort={alignerHostOperations}
        path={folderSourcePath}
        onClose={() => setFolderSourcePath(null)}
        onConfirm={(source) => {
          workspace.setSourcePath(source.path);
          props.onSourcePicked(source);
          setFolderSourcePath(null);
        }}
      />
      <HostFilePickerDialog
        hostPort={alignerHostOperations}
        mode={filePicker.mode}
        open={filePicker.open}
        title={filePicker.title}
        onOpenChange={(open) => {
          setFilePicker((current) => ({ ...current, open }));
          if (!open) pickerModeRef.current = null;
        }}
        onPickDirectory={applyPickDirectory}
        onPickFile={applyPickFile}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
  },
});
