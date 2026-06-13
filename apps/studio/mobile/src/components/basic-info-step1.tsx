import type { AlignerSource } from "@lisca/contracts";
import type { StudioDataSourceKind } from "@lisca/contracts/assay";
import type { HostFilePickerMode } from "@lisca/ui-native/features";
import {
  Field,
  FieldLabel,
  FolderSourceParseModal,
  HostFilePickerDialog,
  DateInput,
  Input,
  SourcePickerModal,
  type HostFilePickerOperations,
} from "@lisca/ui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import { useStudioStore } from "../state/studio-store";
import { recordStudioSourceMemory, recordStudioWorkspaceMemory } from "../utils/studio-memory";
import {
  basicInfoContainerClassName,
  basicInfoFieldLabelClassName,
  basicInfoRowClassName,
} from "./basic-info-layout";
import { useStudioProfile } from "./studio-profile-provider";

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
  const profile = useStudioProfile();
  const info1 = useStudioStore((state) => state.info1);
  const setInfo1 = useStudioStore((state) => state.setInfo1);
  const setDataSourceKind = useStudioStore((state) => state.setDataSourceKind);
  const [openDataModalOpen, setOpenDataModalOpen] = useState(false);
  const [pathPicker, setPathPicker] = useState<StudioPathPickerState>(null);
  const [folderSourcePath, setFolderSourcePath] = useState<string | null>(null);

  const sourceRecent = useStudioMemoryRecent("source", openDataModalOpen);
  const workspaceRecent = useStudioMemoryRecent("workspace", pathPicker?.kind === "save");

  const openSourceBrowser = (mode: HostFilePickerMode) => {
    setOpenDataModalOpen(false);
    setPathPicker({ kind: "source", mode });
  };

  const applySourcePath = (path: string, mode: HostFilePickerMode) => {
    setInfo1({ dataPath: path });
    const kind = kindFromMode(mode);
    setDataSourceKind(kind);
    if (kind === "nd2" || kind === "czi") {
      recordStudioSourceMemory(profile.session, { kind, path } as AlignerSource);
    }
  };

  const applyRecentSource = (source: AlignerSource) => {
    if (source.kind === "folder") {
      setInfo1({
        dataPath: source.path,
        folderSubfolderTemplate: source.subfolderTemplate,
        folderFilenameTemplate: source.filenameTemplate,
      });
      setDataSourceKind("folder");
    } else if (source.kind === "nd2") {
      setInfo1({ dataPath: source.path });
      setDataSourceKind("nd2");
    } else {
      setInfo1({ dataPath: source.path });
      setDataSourceKind("czi");
    }
    recordStudioSourceMemory(profile.session, source);
  };

  return (
    <>
      <View className={basicInfoContainerClassName}>
        <View className={basicInfoRowClassName}>
          <Field className="gap-2.5">
            <FieldLabel className={basicInfoFieldLabelClassName}>Name</FieldLabel>
            <Input
              autoComplete="off"
              placeholder="My assay"
              value={info1.name}
              onChangeText={(name) => setInfo1({ name })}
            />
          </Field>
        </View>
        <View className={basicInfoRowClassName}>
          <Field className="gap-2.5">
            <FieldLabel className={basicInfoFieldLabelClassName}>Date</FieldLabel>
            <DateInput value={info1.date} onChangeText={(date) => setInfo1({ date })} />
          </Field>
        </View>
        <View className={basicInfoRowClassName}>
          <Field className="gap-2.5">
            <FieldLabel className={basicInfoFieldLabelClassName}>Data path</FieldLabel>
            <Pressable onPress={() => setOpenDataModalOpen(true)}>
              <Input
                editable={false}
                pointerEvents="none"
                placeholder="Click to choose source…"
                value={info1.dataPath}
              />
            </Pressable>
          </Field>
        </View>
        <View className={basicInfoRowClassName}>
          <Field className="gap-2.5">
            <FieldLabel className={basicInfoFieldLabelClassName}>Save to</FieldLabel>
            <Pressable onPress={() => setPathPicker({ kind: "save" })}>
              <Input
                editable={false}
                pointerEvents="none"
                placeholder="Click to choose folder…"
                value={info1.saveTo}
              />
            </Pressable>
          </Field>
        </View>
      </View>

      <SourcePickerModal
        open={openDataModalOpen}
        recentSources={sourceRecent.sources}
        onClose={() => setOpenDataModalOpen(false)}
        onOpenCzi={() => openSourceBrowser("czi_file")}
        onOpenFolder={() => openSourceBrowser("folder")}
        onOpenNd2={() => openSourceBrowser("nd2_file")}
        onPickRecentSource={applyRecentSource}
      />
      <HostFilePickerDialog
        hostPort={hostPort}
        mode={pickerMode(pathPicker)}
        open={pathPicker !== null}
        recentItems={pathPicker?.kind === "save" ? workspaceRecent.workspaces : undefined}
        title={pickerTitle(pathPicker)}
        onOpenChange={(open) => {
          if (!open) setPathPicker(null);
        }}
        onPickDirectory={(path) => {
          if (!pathPicker) return;
          if (pathPicker.kind === "save") {
            setInfo1({ saveTo: path });
            recordStudioWorkspaceMemory(profile.session, path, info1.name.trim() || undefined);
          } else if (pathPicker.mode === "folder") {
            setFolderSourcePath(path);
          }
          setPathPicker(null);
        }}
        onPickFile={(path) => {
          if (pathPicker?.kind === "source") applySourcePath(path, pathPicker.mode);
          setPathPicker(null);
        }}
        onPickRecent={(path) => {
          if (pathPicker?.kind === "save") {
            setInfo1({ saveTo: path });
            recordStudioWorkspaceMemory(profile.session, path, info1.name.trim() || undefined);
            setPathPicker(null);
          }
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
          recordStudioSourceMemory(profile.session, source);
          setFolderSourcePath(null);
        }}
      />
    </>
  );
}
