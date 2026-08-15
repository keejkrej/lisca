import type { AlignerSource } from "@lisca/contracts";
import { ASSAY_TYPE, type StudioDataSourceKind } from "@lisca/contracts/assay";
import type { HostFilePickerMode } from "@lisca/ui/features";
import {
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lisca/ui/components";
import {
  FolderSourceParseModal,
  HostFilePickerDialog,
  SourcePickerModal,
} from "@lisca/ui/features";
import type { HostFilePickerOperations } from "@lisca/ui/features";
import {
  defaultIntervalMinutesForAssay,
  defaultMaxOnsetMinutesForAssay,
} from "@lisca/client/studio-assay-json";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { createMemo, createSignal, Show } from "solid-js";

import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import { type TimelapseUnit, studioWizardActions, studioWizardAtom } from "../state/studio-store";
import { recordStudioSourceMemory, recordStudioWorkspaceMemory } from "../utils/studio-memory";

const ROW = "flex min-h-[80px] w-full flex-col gap-2.5 p-2.5";

const TIMELAPSE_UNITS: { value: TimelapseUnit; label: string }[] = [
  { value: "second", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
];

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
  const patch = (p: Parameters<typeof studioWizardActions.patchWizard>[1]) =>
    studioWizardActions.patchWizard(setWizard, p);
  const setAnalysis = (p: Parameters<typeof studioWizardActions.setAnalysis>[1]) =>
    studioWizardActions.setAnalysis(setWizard, p);
  const setDataSourceKind = (kind: StudioDataSourceKind) =>
    studioWizardActions.setDataSourceKind(setWizard, kind);
  const intervalPlaceholder = () => String(defaultIntervalMinutesForAssay(wizard().assayId) ?? 10);
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
    patch({ dataPath: path });
    const kind = kindFromMode(mode);
    setDataSourceKind(kind);
    if (kind === "nd2" || kind === "czi") {
      recordStudioSourceMemory({ kind, path } as AlignerSource);
    }
  };

  const applyRecentSource = (source: AlignerSource) => {
    if (source.kind === "folder") {
      patch({
        dataPath: source.path,
        folderTemplate: {
          subfolder: source.subfolderTemplate,
          filename: source.filenameTemplate,
        },
      });
      setDataSourceKind("folder");
    } else if (source.kind === "nd2") {
      patch({ dataPath: source.path });
      setDataSourceKind("nd2");
    } else {
      patch({ dataPath: source.path });
      setDataSourceKind("czi");
    }
    recordStudioSourceMemory(source);
  };

  return (
    <>
      <div class="flex w-full min-w-0 flex-col gap-2.5">
        <div class={ROW}>
          <Field class="w-full gap-2.5">
            <FieldLabel class="text-xl font-medium" for="studio-name">
              Name
            </FieldLabel>
            <Input
              autocomplete="off"
              class="w-full"
              id="studio-name"
              placeholder="My assay"
              value={wizard().name}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </Field>
        </div>
        <div class={ROW}>
          <Field class="w-full gap-2.5">
            <FieldLabel class="text-xl font-medium" for="studio-source">
              Source
            </FieldLabel>
            <div class="w-full cursor-pointer" onClick={() => setOpenDataModalOpen(true)}>
              <Input
                readonly
                autocomplete="off"
                class="w-full cursor-pointer"
                id="studio-source"
                placeholder="Click to choose source…"
                value={wizard().dataPath}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOpenDataModalOpen(true);
                  }
                }}
              />
            </div>
          </Field>
        </div>
        <div class={ROW}>
          <Field class="w-full gap-2.5">
            <FieldLabel class="text-xl font-medium" for="studio-workspace">
              Workspace
            </FieldLabel>
            <div class="w-full cursor-pointer" onClick={() => setPathPicker({ kind: "save" })}>
              <Input
                readonly
                autocomplete="off"
                class="w-full cursor-pointer"
                id="studio-workspace"
                placeholder="Click to choose folder…"
                value={wizard().workspacePath}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setPathPicker({ kind: "save" });
                  }
                }}
              />
            </div>
          </Field>
        </div>
        <div class={ROW}>
          <Field class="w-full gap-2.5">
            <FieldLabel class="text-xl font-medium" id="studio-timelapse-label">
              Timelapse interval
            </FieldLabel>
            <div class="mt-0 flex w-full min-w-0 flex-row flex-wrap items-stretch gap-2.5">
              <Input
                aria-labelledby="studio-timelapse-label"
                class="min-w-0 flex-1"
                min={1}
                placeholder={intervalPlaceholder()}
                step={1}
                type="number"
                value={wizard().intervalValue ?? ""}
                onChange={(event) => {
                  const raw = event.currentTarget.value;
                  const value = raw.trim() === "" ? null : Number(raw);
                  patch({ intervalValue: value == null || Number.isNaN(value) ? null : value });
                }}
              />
              <Select<TimelapseUnit>
                options={TIMELAPSE_UNITS.map((unit) => unit.value)}
                placement="bottom-end"
                value={wizard().intervalUnit}
                onChange={(unit) => unit != null && patch({ intervalUnit: unit })}
                itemComponent={(props) => (
                  <SelectItem item={props.item}>
                    {TIMELAPSE_UNITS.find((unit) => unit.value === props.item.rawValue)?.label ??
                      props.item.rawValue}
                  </SelectItem>
                )}
              >
                <SelectTrigger
                  aria-labelledby="studio-timelapse-label"
                  class="w-[11rem] shrink-0 sm:w-[10.5rem]"
                >
                  <SelectValue<TimelapseUnit>>
                    {(state) =>
                      TIMELAPSE_UNITS.find((unit) => unit.value === state.selectedOption())?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
          </Field>
        </div>
        <Show when={wizard().assayId === ASSAY_TYPE.TRANSFECTION}>
          <div class={ROW}>
            <Field class="w-full gap-2.5">
              <FieldLabel class="text-xl font-medium" id="studio-max-onset-label">
                Max onset time
              </FieldLabel>
              <p class="text-sm text-muted-foreground">
                Latest time expression is allowed to start, in minutes. Default{" "}
                {defaultMaxOnsetMinutesForAssay(ASSAY_TYPE.TRANSFECTION)}. 0 means start at the
                first frame.
              </p>
              <Input
                aria-labelledby="studio-max-onset-label"
                class="min-w-0 w-full max-w-xs"
                min={0}
                placeholder={String(defaultMaxOnsetMinutesForAssay(ASSAY_TYPE.TRANSFECTION) ?? 120)}
                step={1}
                type="number"
                value={wizard().analysis?.maxOnsetMinutes ?? ""}
                onChange={(event) => {
                  const raw = event.currentTarget.value;
                  if (raw.trim() === "") {
                    setAnalysis({
                      maxOnsetMinutes:
                        defaultMaxOnsetMinutesForAssay(ASSAY_TYPE.TRANSFECTION) ?? 120,
                    });
                    return;
                  }
                  const value = Number(raw);
                  if (Number.isNaN(value) || value < 0) return;
                  setAnalysis({ maxOnsetMinutes: value });
                }}
              />
            </Field>
          </div>
          <div class={ROW}>
            <Field class="w-full gap-2.5">
              <FieldLabel class="text-xl font-medium" for="studio-skip-segment">
                Skip segmentation
              </FieldLabel>
              <p class="text-sm text-muted-foreground">
                Measure the whole site instead of finding a fluorescent region first.
              </p>
              <label class="flex cursor-pointer items-center gap-2.5 text-base">
                <input
                  checked={wizard().analysis?.skipSegment ?? false}
                  class="size-4 shrink-0"
                  id="studio-skip-segment"
                  type="checkbox"
                  onChange={(event) => setAnalysis({ skipSegment: event.currentTarget.checked })}
                />
                <span>Use the full site (skip mask)</span>
              </label>
            </Field>
          </div>
        </Show>
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
            patch({ workspacePath: path });
            recordStudioWorkspaceMemory(path, wizard().name.trim() || undefined);
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
            patch({ workspacePath: path });
            recordStudioWorkspaceMemory(path, wizard().name.trim() || undefined);
            setPathPicker(null);
          }
        }}
      />
      <FolderSourceParseModal
        hostPort={props.hostPort}
        path={folderSourcePath()}
        onClose={() => setFolderSourcePath(null)}
        onConfirm={(source) => {
          patch({
            dataPath: source.path,
            folderTemplate: {
              subfolder: source.subfolderTemplate,
              filename: source.filenameTemplate,
            },
          });
          setDataSourceKind("folder");
          recordStudioSourceMemory(source);
          setFolderSourcePath(null);
        }}
      />
    </>
  );
}
