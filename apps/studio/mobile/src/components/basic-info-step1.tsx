import type { StudioDataSourceKind } from "@lisca/contracts/assay";
import type { HostFilePickerMode } from "@lisca/ui-native/features";
import {
  Field,
  FolderSourceParseModal,
  HostFilePickerDialog,
  Input,
  Section,
  SourcePickerModal,
  type HostFilePickerOperations,
} from "@lisca/ui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useStudioStore } from "../state/studio-store";

type StudioPathPickerState = null | { kind: "save" } | { kind: "source"; mode: HostFilePickerMode };

function pickerTitle(state: StudioPathPickerState): string {
  if (!state) return "";
  if (state.kind === "save") return "Workspace output folder";
  if (state.mode === "folder") return "Image folder";
  if (state.mode === "nd2_file") return "ND2 file";
  if (state.mode === "czi_file") return "CZI file";
  return "Choose source";
}

function pickerMode(state: StudioPathPickerState): HostFilePickerMode {
  if (!state) return "workspace";
  if (state.kind === "save") return "workspace";
  return state.mode;
}

function kindFromMode(mode: HostFilePickerMode): StudioDataSourceKind {
  if (mode === "folder") return "folder";
  if (mode === "nd2_file") return "nd2";
  if (mode === "czi_file") return "czi";
  return null;
}

export function BasicInfoStep1({ hostPort }: { hostPort: HostFilePickerOperations }) {
  const info1 = useStudioStore((state) => state.info1);
  const setInfo1 = useStudioStore((state) => state.setInfo1);
  const setDataSourceKind = useStudioStore((state) => state.setDataSourceKind);
  const [openDataModalOpen, setOpenDataModalOpen] = useState(false);
  const [pathPicker, setPathPicker] = useState<StudioPathPickerState>(null);
  const [folderSourcePath, setFolderSourcePath] = useState<string | null>(null);

  const openSourceBrowser = (mode: HostFilePickerMode) => {
    setOpenDataModalOpen(false);
    setPathPicker({ kind: "source", mode });
  };

  const applySourcePath = (path: string, mode: HostFilePickerMode) => {
    setInfo1({ dataPath: path });
    setDataSourceKind(kindFromMode(mode));
  };

  return (
    <>
      <View className="w-full gap-2">
        <Section contentClassName="gap-2" title="Name">
          <Field label="Name">
            <Input
              autoComplete="off"
              placeholder="My assay"
              value={info1.name}
              onChangeText={(name) => setInfo1({ name })}
            />
          </Field>
        </Section>
        <Section contentClassName="gap-2" title="Date">
          <Field label="Date">
            <Input
              placeholder="YYYY-MM-DD"
              value={info1.date}
              onChangeText={(date) => setInfo1({ date })}
            />
          </Field>
        </Section>
        <Section contentClassName="gap-2" title="Data path">
          <Pressable onPress={() => setOpenDataModalOpen(true)}>
            <Input
              editable={false}
              pointerEvents="none"
              placeholder="Click to choose source..."
              value={info1.dataPath}
            />
          </Pressable>
        </Section>
        <Section contentClassName="gap-2" title="Save to">
          <Pressable onPress={() => setPathPicker({ kind: "save" })}>
            <Input
              editable={false}
              pointerEvents="none"
              placeholder="Click to choose folder..."
              value={info1.saveTo}
            />
          </Pressable>
        </Section>
      </View>

      <SourcePickerModal
        open={openDataModalOpen}
        onClose={() => setOpenDataModalOpen(false)}
        onOpenCzi={() => openSourceBrowser("czi_file")}
        onOpenFolder={() => openSourceBrowser("folder")}
        onOpenNd2={() => openSourceBrowser("nd2_file")}
      />
      <HostFilePickerDialog
        hostPort={hostPort}
        mode={pickerMode(pathPicker)}
        open={pathPicker !== null}
        title={pickerTitle(pathPicker)}
        onOpenChange={(open) => {
          if (!open) setPathPicker(null);
        }}
        onPickDirectory={(path) => {
          if (!pathPicker) return;
          if (pathPicker.kind === "save") setInfo1({ saveTo: path });
          else if (pathPicker.mode === "folder") setFolderSourcePath(path);
          setPathPicker(null);
        }}
        onPickFile={(path) => {
          if (pathPicker?.kind === "source") applySourcePath(path, pathPicker.mode);
          setPathPicker(null);
        }}
      />
      <FolderSourceParseModal
        hostPort={hostPort}
        path={folderSourcePath}
        onClose={() => setFolderSourcePath(null)}
        onConfirm={(source) => {
          setInfo1({
            dataPath: source.path,
            folderSubfolderTemplate: source.subfolderTemplate,
            folderFilenameTemplate: source.filenameTemplate,
          });
          setDataSourceKind("folder");
          setFolderSourcePath(null);
        }}
      />
    </>
  );
}
