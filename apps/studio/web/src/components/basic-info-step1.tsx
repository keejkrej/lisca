import type { HostFilePickerMode, StudioDataSourceKind } from "@lisca/contracts";
import {
  Field,
  FieldLabel,
  FolderSourceParseModal,
  type HostFilePickerOperations,
  HostFilePickerDialog,
  Input,
  SourcePickerModal,
} from "@lisca/ui";
import { useState } from "react";

import { useStudioStore } from "../state/studio-store";

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
      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className={ROW}>
          <Field className="gap-2.5" name="name">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-name">
              Name
            </FieldLabel>
            <Input
              autoComplete="off"
              className="w-full"
              id="studio-name"
              placeholder="My assay"
              value={info1.name}
              onChange={(event) => setInfo1({ name: event.target.value })}
            />
          </Field>
        </div>
        <div className={ROW}>
          <Field className="gap-2.5" name="date">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-date">
              Date
            </FieldLabel>
            <Input
              className="w-full"
              id="studio-date"
              type="date"
              value={info1.date}
              onChange={(event) => setInfo1({ date: event.target.value })}
            />
          </Field>
        </div>
        <div className={ROW}>
          <Field className="gap-2.5" name="dataPath">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-data-path">
              Data path
            </FieldLabel>
            <Input
              readOnly
              autoComplete="off"
              className="w-full cursor-pointer"
              id="studio-data-path"
              placeholder="Click to choose source..."
              value={info1.dataPath}
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
        <div className={ROW}>
          <Field className="gap-2.5" name="saveTo">
            <FieldLabel className="text-2xl font-normal" htmlFor="studio-save-to">
              Save to
            </FieldLabel>
            <Input
              readOnly
              autoComplete="off"
              className="w-full cursor-pointer"
              id="studio-save-to"
              placeholder="Click to choose folder..."
              value={info1.saveTo}
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
          else if (pathPicker.mode === "folder") {
            setFolderSourcePath(path);
          }
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
