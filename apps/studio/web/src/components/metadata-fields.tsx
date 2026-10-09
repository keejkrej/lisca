import type { AlignerSource } from "@lisca/contracts";
import {
  ASSAY_TYPE,
  assayUsesSkipSegment,
  type AssaySegmentationMode,
  type StudioDataSourceKind,
} from "@lisca/contracts/assay";
import type { HostFilePickerMode } from "@lisca/ui/features";
import {
  Field,
  FieldLabel,
  FieldTitle,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Select,
  SelectContent,
  SelectItem,
  ComingSoonTooltip,
  RadioGroup,
  RadioGroupItem,
  SelectTrigger,
  SelectValue,
} from "@lisca/ui/components";
import {
  FolderSourceParseModal,
  HostFilePickerDialog,
  PathPickerField,
  SourcePickerField,
} from "@lisca/ui/features";
import type { HostFilePickerOperations } from "@lisca/ui/features";
import { defaultMaxOnsetMinutesForAssay } from "@lisca/client/studio-assay-json";
import { recentSourceByPath, recentSourcePickerItems } from "@lisca/client/session/recent-memory";
import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { createMemo, createSignal, For, Show } from "solid-js";

import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import { type TimelapseUnit, studioWizardActions, studioWizardAtom } from "../state/studio-store";
import { recordStudioSourceMemory, recordStudioWorkspaceMemory } from "../utils/studio-memory";

const TIMELAPSE_UNITS: { value: TimelapseUnit; label: string }[] = [
  { value: "second", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
];

const SEGMENTATION_MODES: { value: AssaySegmentationMode; label: string }[] = [
  { value: "logstd", label: "Log-std segmentation" },
  { value: "smart", label: "Smart segmentation" },
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

export function MetadataFields(props: { hostPort: HostFilePickerOperations }) {
  const wizard = useAtomValue(() => studioWizardAtom);
  const setWizard = useAtomSet(() => studioWizardAtom);
  const patch = (p: Parameters<typeof studioWizardActions.patchWizard>[1]) =>
    studioWizardActions.patchWizard(setWizard, p);
  const setAnalysis = (p: Parameters<typeof studioWizardActions.setAnalysis>[1]) =>
    studioWizardActions.setAnalysis(setWizard, p);
  const setDataSourceKind = (kind: StudioDataSourceKind) =>
    studioWizardActions.setDataSourceKind(setWizard, kind);
  const [pathPicker, setPathPicker] = createSignal<StudioPathPickerState>(null);
  const [folderSourcePath, setFolderSourcePath] = createSignal<string | null>(null);

  const sourceRecent = createMemo(() =>
    useStudioMemoryRecent("source", pathPicker()?.kind === "source"),
  );
  const workspaceRecent = createMemo(() =>
    useStudioMemoryRecent("workspace", pathPicker()?.kind === "save"),
  );
  const pickerRecentItems = () => {
    const picker = pathPicker();
    if (picker?.kind === "save") return workspaceRecent().workspaces;
    if (picker?.kind === "source") {
      return recentSourcePickerItems(sourceRecent().sources, picker.mode);
    }
    return undefined;
  };

  const openSourceBrowser = (mode: HostFilePickerMode) => {
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
      <div class="flex w-full max-w-[640px] min-w-0 flex-col gap-7">
        <div class="flex flex-col gap-2">
          <h1 class="text-2xl font-semibold leading-8 tracking-[-0.02em]">Info</h1>
          <p class="text-[13px] leading-[18px] text-muted-foreground">
            Name the assay and choose its source data and workspace.
          </p>
        </div>
        <Field class="w-full gap-2">
          <FieldLabel class="text-sm font-medium leading-[18px]" for="studio-name">
            Name
          </FieldLabel>
          <Input
            autocomplete="off"
            class="h-8 w-full px-3 text-[13px]"
            id="studio-name"
            name="assay-name"
            value={wizard().name}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </Field>
        <SourcePickerField
          id="studio-source"
          label="Source"
          placeholder=""
          value={wizard().dataPath}
          onOpenCzi={() => openSourceBrowser("czi_file")}
          onOpenFolder={() => openSourceBrowser("folder")}
          onOpenNd2={() => openSourceBrowser("nd2_file")}
        />
        <PathPickerField
          id="studio-workspace"
          label="Workspace"
          placeholder=""
          value={wizard().workspacePath}
          onOpen={() => setPathPicker({ kind: "save" })}
        />
        <Field class="w-full gap-2">
          <FieldLabel class="text-sm font-medium leading-[18px]" id="studio-timelapse-label">
            Interval
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              autocomplete="off"
              aria-labelledby="studio-timelapse-label"
              class="h-8 px-3 font-mono text-[13px]"
              min={1}
              name="timelapse-interval"
              step={1}
              type="number"
              value={wizard().intervalValue ?? ""}
              onChange={(event) => {
                const raw = event.currentTarget.value;
                const value = raw.trim() === "" ? null : Number(raw);
                patch({ intervalValue: value == null || Number.isNaN(value) ? null : value });
              }}
            />
            <InputGroupAddon align="inline-end" class="pr-1">
              <Select<TimelapseUnit>
                options={TIMELAPSE_UNITS.map((unit) => unit.value)}
                placement="bottom-end"
                sameWidth={false}
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
                  aria-label="Interval unit"
                  class="h-7 border-0 bg-transparent px-2 text-[13px] shadow-none focus-visible:ring-0 dark:bg-transparent"
                  size="sm"
                >
                  <SelectValue<TimelapseUnit>>
                    {(state) =>
                      TIMELAPSE_UNITS.find((unit) => unit.value === state.selectedOption())?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Show when={wizard().assayId === ASSAY_TYPE.TRANSFECTION}>
          <Field class="w-full gap-2">
            <FieldLabel class="text-sm font-medium leading-[18px]" id="studio-max-onset-label">
              Max onset time t0
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                autocomplete="off"
                aria-labelledby="studio-max-onset-label"
                class="h-8 px-3 font-mono text-[13px]"
                min={0}
                name="max-onset-minutes"
                step={1}
                title="Cap on onset time t0 after acquisition start. 0 fixes onset at 0."
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
              <InputGroupAddon align="inline-end">
                <InputGroupText class="text-[13px]">min</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </Show>
        <Show when={assayUsesSkipSegment(wizard().assayId)}>
          <Field class="w-full gap-2">
            <FieldTitle class="text-sm font-medium leading-[18px]">Misc</FieldTitle>
            <label class="flex cursor-pointer items-center gap-2.5 text-[13px] leading-[18px]">
              <input
                checked={wizard().analysis?.skipSegment ?? false}
                class="size-4 shrink-0"
                id="studio-skip-segment"
                name="skip-segmentation"
                type="checkbox"
                onChange={(event) => setAnalysis({ skipSegment: event.currentTarget.checked })}
              />
              <span>Skip segmentation</span>
            </label>
            <div class="flex flex-col gap-2 ps-[calc(1rem+0.625rem)]">
              <span
                class="text-[13px] leading-[18px]"
                classList={{ "text-muted-foreground": wizard().analysis?.skipSegment ?? false }}
                id="studio-segmentation-method-label"
              >
                Segmentation method
              </span>
              <RadioGroup
                aria-labelledby="studio-segmentation-method-label"
                class="w-fit gap-2"
                disabled={wizard().analysis?.skipSegment ?? false}
                name="segmentation-method"
                value={wizard().analysis?.segmentationMode ?? "logstd"}
                onChange={(mode) => {
                  if (mode === "logstd") {
                    setAnalysis({ segmentationMode: mode });
                  }
                }}
              >
                <For each={SEGMENTATION_MODES}>
                  {(mode) => {
                    const skipped = () => wizard().analysis?.skipSegment ?? false;
                    const deferred = () => mode.value === "smart";
                    const unavailable = () => skipped() || deferred();
                    const option = (
                      <label
                        class="flex w-fit items-center gap-2.5 text-[13px] leading-[18px]"
                        classList={{
                          "cursor-pointer": !unavailable(),
                          "cursor-not-allowed text-muted-foreground": unavailable(),
                        }}
                      >
                        <RadioGroupItem disabled={unavailable()} value={mode.value} />
                        <span>{mode.label}</span>
                      </label>
                    );
                    return (
                      <Show when={deferred()} fallback={option}>
                        <ComingSoonTooltip>{option}</ComingSoonTooltip>
                      </Show>
                    );
                  }}
                </For>
              </RadioGroup>
            </div>
          </Field>
        </Show>
      </div>

      <HostFilePickerDialog
        hostPort={props.hostPort}
        mode={pickerMode(pathPicker())}
        open={pathPicker() !== null}
        recentItems={pickerRecentItems()}
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
          const picker = pathPicker();
          if (picker?.kind === "save") {
            patch({ workspacePath: path });
            recordStudioWorkspaceMemory(path, wizard().name.trim() || undefined);
            setPathPicker(null);
            return;
          }
          if (picker?.kind !== "source") return;
          const source = recentSourceByPath(sourceRecent().sources, picker.mode, path);
          if (source) applyRecentSource(source);
          else if (picker.mode === "folder") setFolderSourcePath(path);
          else applySourcePath(path, picker.mode);
          setPathPicker(null);
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
