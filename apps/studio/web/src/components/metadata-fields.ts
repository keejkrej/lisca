import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { recentSourceByPath, recentSourcePickerItems } from "@lisca/client/session/recent-memory";
import { defaultMaxOnsetMinutesForAssay } from "@lisca/client/studio-assay-json";
import { forgetStudioSource, forgetStudioWorkspace } from "@lisca/client/studio/wizard-memory";
import type { AlignerSource, FolderSource } from "@lisca/contracts";
import {
  ASSAY_TYPE,
  assayUsesBindingDetect,
  assayUsesSkipSegment,
  BINDING_DEFAULT_BOX_SIZE,
  BINDING_DEFAULT_MIN_GRADIENT,
  type StudioDataSourceKind,
} from "@lisca/contracts/assay";
import {
  FolderSourceParseModal,
  HostFilePickerDialog,
  PathPickerField,
  SourcePickerField,
  type HostFilePickerMode,
} from "@lisca/instrument";
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
} from "@lisca/ui/primitives";
import { Schema } from "effect";

import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import { studioAtomsSubscription, studioRegistry } from "../state/studio-registry";
import { studioStoreActions, studioWizardAtom, type TimelapseUnit } from "../state/studio-store";
import { recordStudioSourceMemory, recordStudioWorkspaceMemory } from "../utils/studio-memory";

const TIMELAPSE_UNITS: readonly { readonly value: TimelapseUnit; readonly label: string }[] = [
  { value: "second", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
];

const HostFilePickerModeSchema = Schema.Literals([
  "workspace",
  "folder",
  "nd2_file",
  "czi_file",
  "assay_json_file",
]);

const PathPickerStateSchema = Schema.NullOr(
  Schema.Union([
    Schema.Struct({ kind: Schema.Literal("save") }),
    Schema.Struct({ kind: Schema.Literal("source"), mode: HostFilePickerModeSchema }),
  ]),
);

type StudioPathPickerState = typeof PathPickerStateSchema.Type;

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

function applySourcePath(path: string, mode: HostFilePickerMode): void {
  studioStoreActions.patchWizard({ dataPath: path });
  const kind = kindFromMode(mode);
  studioStoreActions.setDataSourceKind(kind);
  if (kind === "nd2" || kind === "czi") {
    recordStudioSourceMemory({ kind, path } as AlignerSource);
  }
}

function applyRecentSource(source: AlignerSource): void {
  if (source.kind === "folder") {
    studioStoreActions.patchWizard({
      dataPath: source.path,
      folderTemplate: {
        subfolder: source.subfolderTemplate,
        filename: source.filenameTemplate,
      },
    });
    studioStoreActions.setDataSourceKind("folder");
  } else if (source.kind === "nd2") {
    studioStoreActions.patchWizard({ dataPath: source.path });
    studioStoreActions.setDataSourceKind("nd2");
  } else {
    studioStoreActions.patchWizard({ dataPath: source.path });
    studioStoreActions.setDataSourceKind("czi");
  }
  recordStudioSourceMemory(source);
}

const FolderSourceSchema = Schema.Struct({
  kind: Schema.Literal("folder"),
  path: Schema.String,
  subfolderTemplate: Schema.String,
  filenameTemplate: Schema.String,
});

const MetadataFieldsMsg = UiSchema.TaggedEnum({
  WizardChanged: {},
  TypedName: { value: Schema.String },
  TypedInterval: { value: Schema.String },
  SetUnitSelectOpen: { open: Schema.Boolean },
  SelectIntervalUnit: { unit: Schema.Literals(["second", "minute", "hour"]) },
  TypedMaxOnset: { value: Schema.String },
  BlurMaxOnset: {},
  TypedMinGradient: { value: Schema.String },
  BlurMinGradient: {},
  TypedBoxSize: { value: Schema.String },
  BlurBoxSize: {},
  ToggleSkipSegment: { checked: Schema.Boolean },
  OpenSourcePicker: { mode: HostFilePickerModeSchema },
  OpenSavePicker: {},
  PickerOpenChanged: { open: Schema.Boolean },
  PickedDirectory: { path: Schema.String },
  PickedFile: { path: Schema.String },
  PickedRecent: { path: Schema.String },
  RemovedRecent: { path: Schema.String },
  ClosedFolderParse: {},
  ConfirmedFolderParse: { source: FolderSourceSchema },
});

const MetadataFieldsComponent = Html.component({
  name: "MetadataFields",
  props: Schema.Struct({}),
  model: Schema.Struct({
    pathPicker: PathPickerStateSchema,
    folderSourcePath: Schema.NullOr(Schema.String),
    recentVersion: Schema.Number,
    unitSelectOpen: Schema.Boolean,
    maxOnsetDraft: Schema.NullOr(Schema.String),
    minGradientDraft: Schema.NullOr(Schema.String),
    boxSizeDraft: Schema.NullOr(Schema.String),
    revision: Schema.Number,
  }),
  message: MetadataFieldsMsg,
}).make({
  init: () => ({
    pathPicker: null,
    folderSourcePath: null,
    recentVersion: 0,
    unitSelectOpen: false,
    maxOnsetDraft: null,
    minGradientDraft: null,
    boxSizeDraft: null,
    revision: 0,
  }),
  update: {
    WizardChanged: ($) => $.evolve({ revision: (n) => n + 1 }),
    TypedName: ($, { value }) => {
      studioStoreActions.patchWizard({ name: value });
      return $.evolve({ revision: (n) => n + 1 });
    },
    TypedInterval: ($, { value }) => {
      const parsed = value.trim() === "" ? null : Number(value);
      studioStoreActions.patchWizard({
        intervalValue: parsed == null || Number.isNaN(parsed) ? null : parsed,
      });
      return $.evolve({ revision: (n) => n + 1 });
    },
    SetUnitSelectOpen: ($, { open }) => $.evolve({ unitSelectOpen: open }),
    SelectIntervalUnit: ($, { unit }) => {
      studioStoreActions.patchWizard({ intervalUnit: unit });
      return $.evolve({ unitSelectOpen: false, revision: (n) => n + 1 });
    },
    TypedMaxOnset: ($, { value }) => {
      if (value.trim() === "") {
        studioStoreActions.setAnalysis({
          maxOnsetMinutes: defaultMaxOnsetMinutesForAssay(ASSAY_TYPE.TRANSFECTION) ?? 120,
        });
        return $.evolve({ maxOnsetDraft: "", revision: (n) => n + 1 });
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        studioStoreActions.setAnalysis({ maxOnsetMinutes: parsed });
        return $.evolve({ maxOnsetDraft: null, revision: (n) => n + 1 });
      }
      return $.evolve({ maxOnsetDraft: value });
    },
    BlurMaxOnset: ($) => $.evolve({ maxOnsetDraft: null }),
    TypedMinGradient: ($, { value }) => {
      if (value.trim() === "") {
        studioStoreActions.setAnalysis({ minGradient: BINDING_DEFAULT_MIN_GRADIENT });
        return $.evolve({ minGradientDraft: "", revision: (n) => n + 1 });
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        studioStoreActions.setAnalysis({ minGradient: parsed });
        return $.evolve({ minGradientDraft: null, revision: (n) => n + 1 });
      }
      return $.evolve({ minGradientDraft: value });
    },
    BlurMinGradient: ($) => $.evolve({ minGradientDraft: null }),
    TypedBoxSize: ($, { value }) => {
      if (value.trim() === "") {
        studioStoreActions.setAnalysis({ boxSize: BINDING_DEFAULT_BOX_SIZE });
        return $.evolve({ boxSizeDraft: "", revision: (n) => n + 1 });
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && parsed >= 3 && parsed % 2 !== 0) {
        studioStoreActions.setAnalysis({ boxSize: parsed });
        return $.evolve({ boxSizeDraft: null, revision: (n) => n + 1 });
      }
      return $.evolve({ boxSizeDraft: value });
    },
    BlurBoxSize: ($) => $.evolve({ boxSizeDraft: null }),
    ToggleSkipSegment: ($, { checked }) => {
      studioStoreActions.setAnalysis({ skipSegment: checked });
      return $.evolve({ revision: (n) => n + 1 });
    },
    OpenSourcePicker: ($, { mode }) => $.evolve({ pathPicker: { kind: "source" as const, mode } }),
    OpenSavePicker: ($) => $.evolve({ pathPicker: { kind: "save" as const } }),
    PickerOpenChanged: ($, { open }) => (!open ? $.evolve({ pathPicker: null }) : $.model),
    PickedDirectory: ($, { path }) => {
      const picker = $.model.pathPicker;
      if (!picker) return $.model;
      if (picker.kind === "save") {
        studioStoreActions.patchWizard({ workspacePath: path });
        recordStudioWorkspaceMemory(
          path,
          studioRegistry.get(studioWizardAtom).name.trim() || undefined,
        );
        return $.evolve({ pathPicker: null, revision: (n) => n + 1 });
      }
      if (picker.mode === "folder") {
        return $.evolve({ pathPicker: null, folderSourcePath: path });
      }
      return $.evolve({ pathPicker: null });
    },
    PickedFile: ($, { path }) => {
      const picker = $.model.pathPicker;
      if (picker?.kind === "source") {
        applySourcePath(path, picker.mode);
      }
      return $.evolve({ pathPicker: null, revision: (n) => n + 1 });
    },
    PickedRecent: ($, { path }) => {
      const picker = $.model.pathPicker;
      if (!picker) return $.model;
      if (picker.kind === "save") {
        studioStoreActions.patchWizard({ workspacePath: path });
        recordStudioWorkspaceMemory(
          path,
          studioRegistry.get(studioWizardAtom).name.trim() || undefined,
        );
        return $.evolve({ pathPicker: null, revision: (n) => n + 1 });
      }
      const sourceRecent = useStudioMemoryRecent("source", true);
      const sourceRefs = sourceRecent.sources.map((entry) =>
        entry.label !== undefined
          ? { source: entry.source, label: entry.label }
          : { source: entry.source },
      );
      const source = recentSourceByPath(sourceRefs, picker.mode, path);
      if (source) {
        applyRecentSource(source);
        return $.evolve({ pathPicker: null, revision: (n) => n + 1 });
      }
      if (picker.mode === "folder") {
        return $.evolve({ pathPicker: null, folderSourcePath: path });
      }
      applySourcePath(path, picker.mode);
      return $.evolve({ pathPicker: null, revision: (n) => n + 1 });
    },
    RemovedRecent: ($, { path }) => {
      const picker = $.model.pathPicker;
      if (picker?.kind === "save") {
        forgetStudioWorkspace(path);
      } else if (
        picker?.kind === "source" &&
        (picker.mode === "folder" || picker.mode === "nd2_file" || picker.mode === "czi_file")
      ) {
        forgetStudioSource(picker.mode, path);
      }
      return $.evolve({ recentVersion: (v) => v + 1 });
    },
    ClosedFolderParse: ($) => $.evolve({ folderSourcePath: null }),
    ConfirmedFolderParse: ($, { source }) => {
      const folderSource: FolderSource = {
        kind: "folder",
        path: source.path,
        subfolderTemplate: source.subfolderTemplate,
        filenameTemplate: source.filenameTemplate,
      };
      studioStoreActions.patchWizard({
        dataPath: folderSource.path,
        folderTemplate: {
          subfolder: folderSource.subfolderTemplate,
          filename: folderSource.filenameTemplate,
        },
      });
      studioStoreActions.setDataSourceKind("folder");
      recordStudioSourceMemory(folderSource);
      return $.evolve({ folderSourcePath: null, revision: (n) => n + 1 });
    },
  },
  subscriptions: () => [
    studioAtomsSubscription(
      "metadata-fields-wizard",
      [studioWizardAtom],
      MetadataFieldsMsg.WizardChanged(),
    ),
  ],
  view: (h, model) => {
    const wizard = studioRegistry.get(studioWizardAtom);
    void model.recentVersion;
    const sourceRecent = useStudioMemoryRecent("source", model.pathPicker?.kind === "source");
    const workspaceRecent = useStudioMemoryRecent("workspace", model.pathPicker?.kind === "save");
    const pickerRecentItems =
      model.pathPicker?.kind === "save"
        ? workspaceRecent.workspaces
        : model.pathPicker?.kind === "source"
          ? recentSourcePickerItems(
              sourceRecent.sources.map((entry) =>
                entry.label !== undefined
                  ? { source: entry.source, label: entry.label }
                  : { source: entry.source },
              ),
              model.pathPicker.mode,
            )
          : undefined;

    const maxOnsetValue =
      model.maxOnsetDraft ??
      (wizard.analysis?.maxOnsetMinutes != null ? String(wizard.analysis.maxOnsetMinutes) : "");
    const minGradientValue =
      model.minGradientDraft ??
      String(wizard.analysis?.minGradient ?? BINDING_DEFAULT_MIN_GRADIENT);
    const boxSizeValue =
      model.boxSizeDraft ?? String(wizard.analysis?.boxSize ?? BINDING_DEFAULT_BOX_SIZE);

    return h.div.class("contents").children(
      h.div.class("flex w-full max-w-[640px] min-w-0 flex-col gap-7").children(
        h.div
          .class("flex flex-col gap-2")
          .children(
            h.h1.class("text-2xl font-semibold leading-8 tracking-[-0.02em]").children("Info"),
            h.p
              .class("text-[13px] leading-[18px] text-muted-foreground")
              .children(
                "Name the assay, choose its image source, and pick the output folder where Studio writes alignment, crops, and results (the workspace).",
              ),
          ),
        Field(h, { class: "w-full gap-2" }).children(
          FieldLabel(h, {
            class: "text-sm font-medium leading-[18px]",
            for: "studio-name",
          }).children("Name"),
          Input(h, {
            class: "h-8 w-full px-3 text-[13px]",
            id: "studio-name",
            name: "assay-name",
            value: wizard.name,
            onInput: (value) => MetadataFieldsMsg.TypedName({ value }),
          }).attr("autocomplete", "off"),
        ),
        SourcePickerField(h, {
          key: "studio-source-picker",
          id: "studio-source",
          label: "Source",
          placeholder: "",
          value: wizard.dataPath,
          onOpenCzi: MetadataFieldsMsg.OpenSourcePicker({ mode: "czi_file" }),
          onOpenFolder: MetadataFieldsMsg.OpenSourcePicker({ mode: "folder" }),
          onOpenNd2: MetadataFieldsMsg.OpenSourcePicker({ mode: "nd2_file" }),
        }),
        h.div.class("flex w-full min-w-0 flex-col gap-2").children(
          PathPickerField(h, {
            id: "studio-workspace",
            label: "Output folder",
            placeholder: "",
            value: wizard.workspacePath,
            onOpen: MetadataFieldsMsg.OpenSavePicker(),
          }),
          h.p
            .class("text-[13px] leading-[18px] text-muted-foreground")
            .children(
              "Studio writes assay.json, alignment, ROI crops, and analysis into this folder. It is the workspace for this run.",
            ),
        ),
        Field(h, { class: "w-full gap-2" }).children(
          FieldLabel(h, { class: "text-sm font-medium leading-[18px]" })
            .attr("id", "studio-timelapse-label")
            .children("Interval"),
          InputGroup(h).children(
            InputGroupInput(h, {
              class: "h-8 px-3 font-mono text-[13px]",
              name: "timelapse-interval",
              type: "number",
              value: wizard.intervalValue != null ? String(wizard.intervalValue) : "",
              onInput: (value) => MetadataFieldsMsg.TypedInterval({ value }),
            })
              .attr("autocomplete", "off")
              .attr("aria-labelledby", "studio-timelapse-label")
              .attr("min", "1")
              .attr("step", "1"),
            InputGroupAddon(h, { align: "inline-end", class: "pr-1" }).children(
              Select(h, {
                key: "interval-unit-select",
                ariaLabel: "Interval unit",
                triggerClass:
                  "h-7 border-0 bg-transparent px-2 text-[13px] shadow-none focus-visible:ring-0 dark:bg-transparent",
                triggerSize: "sm",
                placement: "bottom-end",
                sameWidth: false,
                open: model.unitSelectOpen,
                value: wizard.intervalUnit,
                items: TIMELAPSE_UNITS,
                renderValue: (selected) => View.text(selected?.label ?? ""),
                onOpenChange: (open) => MetadataFieldsMsg.SetUnitSelectOpen({ open }),
                onChange: (next) => {
                  if (next === "second" || next === "minute" || next === "hour") {
                    return MetadataFieldsMsg.SelectIntervalUnit({ unit: next });
                  }
                  return undefined;
                },
              }),
            ),
          ),
        ),
        wizard.assayId === ASSAY_TYPE.TRANSFECTION
          ? Field(h, { class: "w-full gap-2" }).children(
              FieldLabel(h, { class: "text-sm font-medium leading-[18px]" })
                .attr("id", "studio-max-onset-label")
                .children("Max onset time t0"),
              InputGroup(h).children(
                InputGroupInput(h, {
                  class: "h-8 px-3 font-mono text-[13px]",
                  name: "max-onset-minutes",
                  type: "number",
                  value: maxOnsetValue,
                  onInput: (value) => MetadataFieldsMsg.TypedMaxOnset({ value }),
                })
                  .attr("autocomplete", "off")
                  .attr("aria-labelledby", "studio-max-onset-label")
                  .attr("min", "0")
                  .attr("step", "1")
                  .attr(
                    "title",
                    "Cap on onset time t0 after acquisition start. 0 fixes onset at 0.",
                  )
                  .on("blur", MetadataFieldsMsg.BlurMaxOnset()),
                InputGroupAddon(h, { align: "inline-end" }).children(
                  InputGroupText(h, { class: "text-[13px]" }).children("min"),
                ),
              ),
            )
          : undefined,
        assayUsesBindingDetect(wizard.assayId)
          ? [
              Field(h, { class: "w-full gap-2" })
                .key("binding-min-gradient")
                .children(
                  FieldLabel(h, { class: "text-sm font-medium leading-[18px]" })
                    .attr("id", "studio-min-gradient-label")
                    .children("Spot threshold"),
                  InputGroup(h).children(
                    InputGroupInput(h, {
                      class: "h-8 px-3 font-mono text-[13px]",
                      name: "min-gradient",
                      type: "number",
                      value: minGradientValue,
                      onInput: (value) => MetadataFieldsMsg.TypedMinGradient({ value }),
                    })
                      .attr("autocomplete", "off")
                      .attr("aria-labelledby", "studio-min-gradient-label")
                      .attr("min", "0")
                      .attr("step", "1")
                      .attr(
                        "title",
                        "Picasso minimum radial net gradient. Lower finds dimmer spots.",
                      )
                      .on("blur", MetadataFieldsMsg.BlurMinGradient()),
                  ),
                ),
              Field(h, { class: "w-full gap-2" })
                .key("binding-box-size")
                .children(
                  FieldLabel(h, { class: "text-sm font-medium leading-[18px]" })
                    .attr("id", "studio-box-size-label")
                    .children("Detection box"),
                  InputGroup(h).children(
                    InputGroupInput(h, {
                      class: "h-8 px-3 font-mono text-[13px]",
                      name: "box-size",
                      type: "number",
                      value: boxSizeValue,
                      onInput: (value) => MetadataFieldsMsg.TypedBoxSize({ value }),
                    })
                      .attr("autocomplete", "off")
                      .attr("aria-labelledby", "studio-box-size-label")
                      .attr("min", "3")
                      .attr("step", "2")
                      .attr("title", "Odd Picasso box side length in pixels for identify and fit.")
                      .on("blur", MetadataFieldsMsg.BlurBoxSize()),
                    InputGroupAddon(h, { align: "inline-end" }).children(
                      InputGroupText(h, { class: "text-[13px]" }).children("px"),
                    ),
                  ),
                ),
            ]
          : undefined,
        assayUsesSkipSegment(wizard.assayId)
          ? Field(h, { class: "w-full gap-2" }).children(
              FieldTitle(h, { class: "text-sm font-medium leading-[18px]" }).children("Misc"),
              h.label
                .class("flex cursor-pointer items-center gap-2.5 text-[13px] leading-[18px]")
                .children(
                  h.input
                    .id("studio-skip-segment")
                    .attr("name", "skip-segmentation")
                    .attr("type", "checkbox")
                    .class("size-4 shrink-0")
                    .checked(wizard.analysis?.skipSegment ?? false)
                    .on("change", ({ checked }) =>
                      MetadataFieldsMsg.ToggleSkipSegment({ checked }),
                    ),
                  h.span.children("Skip segmentation"),
                ),
              h.p
                .class("text-[13px] leading-[18px] text-muted-foreground")
                .children(
                  "When on, analysis uses the full crop and a 10th-percentile background instead of a cell mask. The transfection notebooks follow this switch. Contrast on Align and Annotate is display-only and does not change these numbers.",
                ),
            )
          : undefined,
      ),
      HostFilePickerDialog(h, {
        key: "metadata-file-picker",
        mode: pickerMode(model.pathPicker),
        open: model.pathPicker !== null,
        recentItems: pickerRecentItems,
        title: pickerTitle(model.pathPicker),
        onOpenChange: (open) => MetadataFieldsMsg.PickerOpenChanged({ open }),
        onPickDirectory: (path) => MetadataFieldsMsg.PickedDirectory({ path }),
        onPickFile: (path) => MetadataFieldsMsg.PickedFile({ path }),
        onPickRecent: (path) => MetadataFieldsMsg.PickedRecent({ path }),
        onRemoveRecent: (path) => MetadataFieldsMsg.RemovedRecent({ path }),
      }),
      FolderSourceParseModal(h, {
        key: "metadata-folder-parse-modal",
        path: model.folderSourcePath,
        onClose: MetadataFieldsMsg.ClosedFolderParse(),
        onConfirm: (source) => MetadataFieldsMsg.ConfirmedFolderParse({ source }),
      }),
    );
  },
});

export function MetadataFields<M>(h: Html.H<M>, options?: { readonly key?: string | undefined }) {
  return MetadataFieldsComponent(h, {
    ...(options?.key !== undefined ? { key: options.key } : {}),
    props: {},
  });
}
