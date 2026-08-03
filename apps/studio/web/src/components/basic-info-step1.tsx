import type { AlignerSource } from "@lisca/contracts";
import { ASSAY_TYPE, type StudioDataSourceKind } from "@lisca/contracts/assay";
import type { HostFilePickerMode } from "@lisca/ui/features";
import {
  cn,
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
import { createMemo, createSignal, For, Show } from "solid-js";

import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import {
  type BasicInfo2FeatureId,
  type TimelapseUnit,
  studioWizardActions,
  studioWizardAtom,
} from "../state/studio-store";
import { recordStudioSourceMemory, recordStudioWorkspaceMemory } from "../utils/studio-memory";

const ROW = "flex min-h-[80px] w-full flex-col gap-2.5 p-2.5";

const TIMELAPSE_UNITS: { value: TimelapseUnit; label: string }[] = [
  { value: "second", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
];

const FEATURES: { id: BasicInfo2FeatureId; title: string }[] = [
  { id: "morphology", title: "Morphology" },
  { id: "partcount", title: "Particle count" },
  { id: "partfluor", title: "Particle fluorescence" },
  { id: "totalfluor", title: "Total fluorescence" },
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
  const setInfo1 = (patch: Parameters<typeof studioWizardActions.setInfo1>[1]) =>
    studioWizardActions.setInfo1(setWizard, patch);
  const setInfo2 = (patch: Parameters<typeof studioWizardActions.setInfo2>[1]) =>
    studioWizardActions.setInfo2(setWizard, patch);
  const setAnalysis = (patch: Parameters<typeof studioWizardActions.setAnalysis>[1]) =>
    studioWizardActions.setAnalysis(setWizard, patch);
  const setDataSourceKind = (kind: StudioDataSourceKind) =>
    studioWizardActions.setDataSourceKind(setWizard, kind);
  const intervalPlaceholder = () =>
    String(defaultIntervalMinutesForAssay(wizard().assayId) ?? 10);
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

  const selectedFeatures = () =>
    Array.isArray(wizard().info2.selectedFeatures) ? wizard().info2.selectedFeatures : [];
  const isFeatureSelected = (id: BasicInfo2FeatureId) => selectedFeatures().includes(id);
  const toggleFeature = (id: BasicInfo2FeatureId) => {
    const current = selectedFeatures();
    setInfo2({
      selectedFeatures: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  };

  return (
    <>
      <div class="flex w-full min-w-0 flex-col gap-2.5">
        <div class={ROW}>
          <Field class="w-full gap-2.5">
            <FieldLabel class="text-2xl font-normal" for="studio-name">
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
          <Field class="w-full gap-2.5">
            <FieldLabel class="text-2xl font-normal" for="studio-source">
              Source
            </FieldLabel>
            <div
              class="w-full cursor-pointer"
              onClick={() => setOpenDataModalOpen(true)}
            >
              <Input
                readonly
                autocomplete="off"
                class="w-full cursor-pointer"
                id="studio-source"
                placeholder="Click to choose source…"
                value={wizard().info1.dataPath}
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
            <FieldLabel class="text-2xl font-normal" for="studio-workspace">
              Workspace
            </FieldLabel>
            <div
              class="w-full cursor-pointer"
              onClick={() => setPathPicker({ kind: "save" })}
            >
              <Input
                readonly
                autocomplete="off"
                class="w-full cursor-pointer"
                id="studio-workspace"
                placeholder="Click to choose folder…"
                value={wizard().info1.saveTo}
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
            <FieldLabel class="text-2xl font-normal" id="studio-timelapse-label">
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
                value={wizard().info2.timelapseAmount ?? ""}
                onChange={(event) => {
                  const raw = event.currentTarget.value;
                  const value = raw.trim() === "" ? null : Number(raw);
                  setInfo2({ timelapseAmount: value == null || Number.isNaN(value) ? null : value });
                }}
              />
              <Select<TimelapseUnit>
                options={TIMELAPSE_UNITS.map((unit) => unit.value)}
                placement="bottom-end"
                value={wizard().info2.timelapseUnit}
                onChange={(unit) => unit != null && setInfo2({ timelapseUnit: unit })}
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
              <FieldLabel class="text-2xl font-normal" id="studio-max-onset-label">
                Max onset (minutes)
              </FieldLabel>
              <p class="text-sm text-muted-foreground">
                Transfection kinetic fit: cap candidate translation-onset times. Default{" "}
                {defaultMaxOnsetMinutesForAssay(ASSAY_TYPE.TRANSFECTION)}. Set 0 to fix onset at 0.
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
                      maxOnsetMinutes: defaultMaxOnsetMinutesForAssay(ASSAY_TYPE.TRANSFECTION) ?? 120,
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
            <Field class="gap-2.5">
              <FieldLabel class="text-2xl font-normal">Features</FieldLabel>
              <div class="mt-0 flex flex-col gap-1">
                <For each={FEATURES}>
                  {({ id, title }) => (
                    <label
                      class={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-base transition-colors",
                        isFeatureSelected(id)
                          ? "border-primary/40 bg-accent/50"
                          : "border-border hover:bg-muted/30",
                      )}
                    >
                      <input
                        class="size-4 shrink-0"
                        checked={isFeatureSelected(id)}
                        type="checkbox"
                        value={id}
                        onChange={() => toggleFeature(id)}
                      />
                      <span>{title}</span>
                    </label>
                  )}
                </For>
              </div>
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
