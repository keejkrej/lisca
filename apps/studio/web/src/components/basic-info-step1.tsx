import type { AlignerSource } from "@lisca/contracts";
import type { StudioDataSourceKind } from "@lisca/contracts/assay";
import type { HostFilePickerMode } from "@lisca/ui/features";
import { Field, FieldLabel, Input } from "@lisca/ui/components";
import {
  FolderSourceParseModal,
  HostFilePickerDialog,
  SourcePickerModal,
} from "@lisca/ui/features";
import type { HostFilePickerOperations } from "@lisca/ui/features";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { createMemo, createSignal } from "solid-js";

import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import { studioWizardActions, studioWizardAtom } from "../state/studio-store";
import { recordStudioSourceMemory, recordStudioWorkspaceMemory } from "../utils/studio-memory";

const ROW = "flex min-h-[100px] w-full flex-col gap-2.5 p-2.5";

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

export function BasicInfoStep1(props: { hostPort: HostFilePickerOperations }) {
  const wizard = useAtomValue(studioWizardAtom);
  const setWizard = useAtomSet(studioWizardAtom);
  const setInfo1 = (patch: Parameters<typeof studioWizardActions.setInfo1>[1]) =>
    studioWizardActions.setInfo1(setWizard, patch);
  const setDataSourceKind = (kind: StudioDataSourceKind) =>
    studioWizardActions.setDataSourceKind(setWizard, kind);
  const [openDataModalOpen, setOpenDataModalOpen] = createSignal(false);
  const [pathPicker, setPathPicker] = createSignal<StudioPathPickerState>(null);
  const [folderSourcePath, setFolderSourcePath] = createSignal<string | null>(null);

  const sourceRecent = createMemo(() => useStudioMemoryRecent("source", openDataModalOpen()));
  const workspaceRecent = createMemo(() =>
    useStudioMemoryRecent("workspace", pathPicker()?.kind === "save"),
  );

  const openSourceBrowser = (mode: HostFilePickerMode) => {
    setOpenDataModalOpen(false);
    setPathPicker({ kind: "source", mode });
  };

  const applySourcePath = (path: string, mode: HostFilePickerMode) => {
    setInfo1({ dataPath: path });
    const kind = kindFromMode(mode);
    setDataSourceKind(kind);
    if (kind === "nd2" || kind === "czi") {
      recordStudioSourceMemory({ kind, path } as AlignerSource);
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
    recordStudioSourceMemory(source);
  };

  return (
    <>
      <div class="flex w-full min-w-0 flex-col gap-2.5">
        <div class={ROW}>
          <Field class="gap-2.5" name="name">
            <FieldLabel class="text-2xl font-normal" htmlFor="studio-name">
              Name
            </FieldLabel>
            <Input
              autocomplete="off"
              class="w-full"
              id="studio-name"
              placeholder="My assay"
              value={wizard().info1.name}
              onChange={(event) => setInfo1({ name: event.target.value })}
            />
          </Field>
        </div>
        <div class={ROW}>
          <Field class="gap-2.5" name="date">
            <FieldLabel class="text-2xl font-normal" htmlFor="studio-date">
              Date
            </FieldLabel>
            <Input
              class="w-full"
              id="studio-date"
              type="date"
              value={wizard().info1.date}
              onChange={(event) => setInfo1({ date: event.target.value })}
            />
          </Field>
        </div>
        <div class={ROW}>
          <Field class="gap-2.5" name="dataPath">
            <FieldLabel class="text-2xl font-normal" htmlFor="studio-data-path">
              Data path
            </FieldLabel>
            <Input
              readOnly
              autocomplete="off"
              class="w-full cursor-pointer"
              id="studio-data-path"
              placeholder="Click to choose source…"
              value={wizard().info1.dataPath}
              onClick={() => setOpenDataModalOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpenDataModalOpen(true);
                }
              }}
            />
          </Field>
        </div>
        <div class={ROW}>
          <Field class="gap-2.5" name="saveTo">
            <FieldLabel class="text-2xl font-normal" htmlFor="studio-save-to">
              Save to
            </FieldLabel>
            <Input
              readOnly
              autocomplete="off"
              class="w-full cursor-pointer"
              id="studio-save-to"
              placeholder="Click to choose folder…"
              value={wizard().info1.saveTo}
              onClick={() => setPathPicker({ kind: "save" })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setPathPicker({ kind: "save" });
                }
              }}
            />
          </Field>
        </div>
      </div>

      <SourcePickerModal
        open={openDataModalOpen()}
        recentSources={sourceRecent().sources}
        onClose={() => setOpenDataModalOpen(false)}
        onOpenCzi={() => openSourceBrowser("czi_file")}
        onOpenFolder={() => openSourceBrowser("folder")}
        onOpenNd2={() => openSourceBrowser("nd2_file")}
        onPickRecentSource={applyRecentSource}
      />
      <HostFilePickerDialog
        hostPort={props.hostPort}
        mode={pickerMode(pathPicker())}
        open={pathPicker() !== null}
        recentItems={pathPicker()?.kind === "save" ? workspaceRecent().workspaces : undefined}
        title={pickerTitle(pathPicker())}
        onOpenChange={(open) => {
          if (!open) setPathPicker(null);
        }}
        onPickDirectory={(path) => {
          const picker = pathPicker();
          if (!picker) return;
          if (picker.kind === "save") {
            setInfo1({ saveTo: path });
            recordStudioWorkspaceMemory(path, wizard().info1.name.trim() || undefined);
          } else if (picker.mode === "folder") {
            setFolderSourcePath(path);
          }
          setPathPicker(null);
        }}
        onPickFile={(path) => {
          const picker = pathPicker();
          if (picker?.kind === "source") applySourcePath(path, picker.mode);
          setPathPicker(null);
        }}
        onPickRecent={(path) => {
          if (pathPicker()?.kind === "save") {
            setInfo1({ saveTo: path });
            recordStudioWorkspaceMemory(path, wizard().info1.name.trim() || undefined);
            setPathPicker(null);
          }
        }}
      />
      <FolderSourceParseModal
        hostPort={props.hostPort}
        path={folderSourcePath()}
        onClose={() => setFolderSourcePath(null)}
        onConfirm={(source) => {
          setInfo1({
            dataPath: source.path,
            folderSubfolderTemplate: source.subfolderTemplate,
            folderFilenameTemplate: source.filenameTemplate,
          });
          setDataSourceKind("folder");
          recordStudioSourceMemory(source);
          setFolderSourcePath(null);
        }}
      />
    </>
  );
}