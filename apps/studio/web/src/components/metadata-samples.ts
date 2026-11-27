import { Subscription, UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { resultData } from "@lisca/client/atoms";
import {
  catalogFromScan,
  commitDisplayPositionDraft,
  formatPositionChip,
  formatResolvedPreview,
  migrateSamplePositions,
  POSITION_INDEX_VERSION,
  storedIndexSet,
  toggleIndexInStored,
  type PositionCatalog,
} from "@lisca/client/studio/position-index";
import {
  collectAssayPositions,
  formatStoredPositions,
  storedPositionRanges,
  type StoredPositionRange,
} from "@lisca/client/studio/sample-positions";
import { toStudioSource } from "@lisca/client/studio/source";
import { cn } from "@lisca/ui/cn";
import { Icon } from "@lisca/ui/icons";
import {
  Button,
  Card,
  CardContent,
  Input,
  Tooltip,
  TOOLTIP_CONTENT_CLASS,
} from "@lisca/ui/primitives";
import { Effect, Queue, Schema, Stream } from "effect";

import { scanSourceAtom } from "../atoms/studio-query-atoms";
import { studioAtomsSubscription, studioRegistry } from "../state/studio-registry";
import { studioStoreActions, studioWizardAtom } from "../state/studio-store";

const PositionCatalogSchema = Schema.Struct({
  kind: Schema.Literals(["folder", "nd2", "czi"]),
  ids: Schema.Array(Schema.Number),
  labels: Schema.Array(Schema.String),
});

const SamplePositionsMsg = UiSchema.TaggedEnum({
  InputChanged: { raw: Schema.String, pasted: Schema.Boolean },
  Blurred: {},
  EnterPressed: {},
  BackspacePressed: {},
  RemoveRange: { start: Schema.Number, end: Schema.Number },
});

const SamplePositionsEvents = UiSchema.TaggedEnum({
  Changed: { positions: Schema.String },
});

/**
 * Edits 0-based source indices as source-label chips. `1-5, 21-25` matches
 * displayed labels, not a hidden +1 conversion.
 */
const SamplePositionsInputComponent = Html.component({
  name: "SamplePositionsInput",
  props: Schema.Struct({
    catalog: Schema.NullOr(PositionCatalogSchema),
    id: Schema.String,
    name: Schema.String,
    value: Schema.String,
  }),
  model: Schema.Struct({
    draft: Schema.String,
    invalid: Schema.Boolean,
  }),
  message: SamplePositionsMsg,
  events: SamplePositionsEvents,
}).make({
  init: () => ({ draft: "", invalid: false }),
  update: {
    InputChanged: ($, { raw, pasted }) => {
      const catalog = $.props.catalog as PositionCatalog | null;
      if (!catalog) {
        return $.evolve({ draft: raw, invalid: raw.trim().length > 0 });
      }
      const next = commitDisplayPositionDraft($.props.value, raw, pasted, catalog);
      const step = $.evolve({ draft: next.draft, invalid: next.invalid });
      return next.positions !== $.props.value
        ? step.emit(SamplePositionsEvents.Changed({ positions: next.positions }))
        : step;
    },
    Blurred: ($) => {
      const catalog = $.props.catalog as PositionCatalog | null;
      if (!catalog) {
        return $.evolve({ invalid: $.model.draft.trim().length > 0 });
      }
      const next = commitDisplayPositionDraft($.props.value, $.model.draft, true, catalog);
      const step = $.evolve({ draft: next.draft, invalid: next.invalid });
      return next.positions !== $.props.value
        ? step.emit(SamplePositionsEvents.Changed({ positions: next.positions }))
        : step;
    },
    EnterPressed: ($) => {
      const catalog = $.props.catalog as PositionCatalog | null;
      if (!catalog) {
        return $.evolve({ invalid: $.model.draft.trim().length > 0 });
      }
      const next = commitDisplayPositionDraft($.props.value, $.model.draft, true, catalog);
      const step = $.evolve({ draft: next.draft, invalid: next.invalid });
      return next.positions !== $.props.value
        ? step.emit(SamplePositionsEvents.Changed({ positions: next.positions }))
        : step;
    },
    BackspacePressed: ($) => {
      const ranges = storedPositionRanges($.props.value);
      if ($.model.draft !== "" || ranges.length === 0) return $.model;
      const nextPositions = formatStoredPositions(ranges.slice(0, -1));
      return nextPositions !== $.props.value
        ? $.emit(SamplePositionsEvents.Changed({ positions: nextPositions }))
        : $.model;
    },
    RemoveRange: ($, { start, end }) => {
      const ranges = storedPositionRanges($.props.value);
      const nextPositions = formatStoredPositions(
        ranges.filter((item) => item.start !== start || item.end !== end),
      );
      return nextPositions !== $.props.value
        ? $.emit(SamplePositionsEvents.Changed({ positions: nextPositions }))
        : $.model;
    },
  },
  view: (h, model) => {
    const ranges = storedPositionRanges(h.props.value);
    const catalog = h.props.catalog as PositionCatalog | null;

    let wrapper = h.div.class(
      "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-none border border-input bg-transparent px-1.5 py-1 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20",
    );
    if (model.invalid) {
      wrapper = wrapper.attr("aria-invalid", "true");
    }

    let input = h.input
      .id(h.props.id)
      .attr("autocomplete", "off")
      .attr("aria-label", "Positions")
      .attr("name", h.props.name)
      .class("h-6 min-w-16 flex-1 border-0 bg-transparent px-1 font-mono text-[13px] outline-none")
      .value(model.draft)
      .on("blur", SamplePositionsMsg.Blurred())
      .on("input", ({ value, inputType }) =>
        SamplePositionsMsg.InputChanged({
          raw: value,
          pasted: inputType === "insertFromPaste",
        }),
      )
      .on(
        "keydown",
        ({ key }) => {
          if (key === "Enter") {
            return SamplePositionsMsg.EnterPressed();
          }
          if (key === "Backspace" && model.draft === "" && ranges.length > 0) {
            return SamplePositionsMsg.BackspacePressed();
          }
          return undefined;
        },
        { preventDefault: true },
      );

    if (model.invalid) {
      input = input.attr("aria-invalid", "true");
    }

    return wrapper.children(
      ...ranges.map((range: StoredPositionRange) => {
        const label = catalog ? formatPositionChip(range, catalog) : `${range.start}–${range.end}`;
        return h.span
          .key(`${range.start}-${range.end}`)
          .class(
            "inline-flex h-6 max-w-full items-center gap-0.5 bg-muted px-1.5 font-mono text-[12px] text-foreground",
          )
          .children(
            h.span.class("truncate").children(label),
            Button(h, {
              ariaLabel: `Remove ${label}`,
              class: "size-4",
              size: "icon-xs",
              type: "button",
              variant: "ghost",
              onPress: SamplePositionsMsg.RemoveRange({ start: range.start, end: range.end }),
            }).children(Icon(h, "x", { class: "size-3" })),
          );
      }),
      input,
    );
  },
});

const MetadataSamplesMsg = UiSchema.TaggedEnum({
  WizardChanged: {},
  ScanChanged: {},
  SetTooltipOpen: { tooltipId: Schema.NullOr(Schema.String) },
  SetAssaySegmentationChannel: { value: Schema.String },
  SetAssaySignalChannel: { value: Schema.String },
  AddSample: {},
  RemoveSample: { index: Schema.Number },
  UpdateSampleName: { index: Schema.Number, value: Schema.String },
  UpdateSamplePositions: { index: Schema.Number, value: Schema.String },
  UpdateSampleSegmentation: { index: Schema.Number, value: Schema.String },
  UpdateSampleSignal: { index: Schema.Number, value: Schema.String },
});

function currentSourceJson(): string | null {
  const wizard = studioRegistry.get(studioWizardAtom);
  const src = toStudioSource({
    kind: wizard.dataSourceKind,
    dataPath: wizard.dataPath,
    folderTemplate: wizard.folderTemplate,
  });
  return src ? JSON.stringify(src) : null;
}

function resolveCatalog(
  hasExplicitCatalog: boolean,
  explicitCatalog: PositionCatalog | null,
): PositionCatalog | null {
  if (hasExplicitCatalog) return explicitCatalog;
  const sourceJson = currentSourceJson();
  if (!sourceJson) return null;
  const scan = resultData(studioRegistry.get(scanSourceAtom(sourceJson)));
  if (!scan) return null;
  return catalogFromScan(studioRegistry.get(studioWizardAtom).dataSourceKind, scan);
}

function tryMigrateSamples(catalog: PositionCatalog | null): string | null {
  const state = studioRegistry.get(studioWizardAtom);
  if (!catalog || state.positionIndexVersion === POSITION_INDEX_VERSION) {
    return null;
  }
  const migrated = migrateSamplePositions(state.samples, state.positionIndexVersion, catalog);
  if (!migrated.ok) {
    return migrated.error;
  }
  studioStoreActions.patchWizard({
    samples: migrated.samples,
    positionIndexVersion: POSITION_INDEX_VERSION,
  });
  return null;
}

function SampleField<M, R = never>(
  h: Html.H<M>,
  options: {
    readonly fieldId: string;
    readonly label: string;
    readonly hint?: string | undefined;
    readonly tooltipOpen: boolean;
    readonly onTooltipOpenChange: (open: boolean) => M;
    readonly child: View.Input<M, R>;
  },
) {
  return h.div.class("flex min-w-0 flex-col gap-1.5").children(
    h.div.class("flex min-w-0 items-center gap-1").children(
      h.label
        .attr("for", options.fieldId)
        .class("text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground")
        .children(options.label),
      options.hint
        ? Tooltip(h, {
            key: `tooltip-${options.fieldId}`,
            props: {
              open: options.tooltipOpen,
              delay: 200,
              side: "top",
              align: "center",
              sideOffset: 4,
              describesTrigger: true,
            },
            onEmit: {
              RequestedOpen: () => options.onTooltipOpenChange(true),
              RequestedClose: () => options.onTooltipOpenChange(false),
            },
            view: (tooltip) =>
              h.span.class("inline-flex").children(
                tooltip
                  .trigger(h.button)
                  .attr("type", "button")
                  .attr("aria-label", `${options.label} details`)
                  .class(
                    "inline-flex size-3.5 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground",
                  )
                  .children(Icon(h, "info", { class: "size-3.5" })),
                tooltip
                  .positioner(h.div)
                  .class("z-50")
                  .children(
                    tooltip
                      .popup(h.div)
                      .class(
                        cn(
                          TOOLTIP_CONTENT_CLASS,
                          "max-w-56 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-4 tracking-normal",
                        ),
                      )
                      .children(options.hint),
                  ),
              ),
          })
        : undefined,
    ),
    options.child,
  );
}

function PositionCheckboxList<M>(
  h: Html.H<M>,
  options: {
    readonly catalog: PositionCatalog;
    readonly sampleIndex: number;
    readonly value: string;
    readonly onChange: (positions: string) => M;
  },
) {
  const selected = storedIndexSet(options.value);
  return h.div
    .attr("aria-label", `Detected positions for sample ${options.sampleIndex + 1}`)
    .class("flex flex-col gap-1 border border-input p-2")
    .children(
      ...options.catalog.labels.map((label, index) => {
        const display = options.catalog.kind === "folder" ? `Pos${label}` : label;
        return h.label
          .key(`${index}-${label}`)
          .class("flex items-center gap-2 font-mono text-[12px] text-foreground")
          .children(
            h.input
              .attr("type", "checkbox")
              .checked(selected.has(index))
              .on("change", ({ checked }) =>
                options.onChange(toggleIndexInStored(options.value, index, checked)),
              ),
            display,
          );
      }),
    );
}

const MetadataSamplesComponent = Html.component({
  name: "MetadataSamples",
  props: Schema.Struct({
    hasExplicitCatalog: Schema.Boolean,
    explicitCatalog: Schema.NullOr(PositionCatalogSchema),
  }),
  model: Schema.Struct({
    encodingError: Schema.NullOr(Schema.String),
    openTooltipId: Schema.NullOr(Schema.String),
    sourceJson: Schema.NullOr(Schema.String),
    revision: Schema.Number,
  }),
  message: MetadataSamplesMsg,
}).make({
  init: ($) => {
    const catalog = resolveCatalog(
      $.props.hasExplicitCatalog,
      $.props.explicitCatalog as PositionCatalog | null,
    );
    const encodingError = tryMigrateSamples(catalog);
    return {
      encodingError,
      openTooltipId: null,
      sourceJson: currentSourceJson(),
      revision: 0,
    };
  },
  update: {
    WizardChanged: ($) => {
      const catalog = resolveCatalog(
        $.props.hasExplicitCatalog,
        $.props.explicitCatalog as PositionCatalog | null,
      );
      const encodingError = tryMigrateSamples(catalog);
      return $.evolve({
        encodingError,
        sourceJson: currentSourceJson(),
        revision: (n) => n + 1,
      });
    },
    ScanChanged: ($) => {
      const catalog = resolveCatalog(
        $.props.hasExplicitCatalog,
        $.props.explicitCatalog as PositionCatalog | null,
      );
      const encodingError = tryMigrateSamples(catalog);
      return $.evolve({
        encodingError,
        revision: (n) => n + 1,
      });
    },
    SetTooltipOpen: ($, { tooltipId }) => $.evolve({ openTooltipId: tooltipId }),
    SetAssaySegmentationChannel: ($, { value }) => {
      studioStoreActions.patchWizard({ segmentationChannel: value });
      return $.evolve({ revision: (n) => n + 1 });
    },
    SetAssaySignalChannel: ($, { value }) => {
      studioStoreActions.patchWizard({ signalChannel: value });
      return $.evolve({ revision: (n) => n + 1 });
    },
    AddSample: ($) => {
      studioStoreActions.addSample();
      return $.evolve({ revision: (n) => n + 1 });
    },
    RemoveSample: ($, { index }) => {
      studioStoreActions.removeSample(index);
      return $.evolve({ revision: (n) => n + 1 });
    },
    UpdateSampleName: ($, { index, value }) => {
      studioStoreActions.updateSample(index, { name: value });
      return $.evolve({ revision: (n) => n + 1 });
    },
    UpdateSamplePositions: ($, { index, value }) => {
      studioStoreActions.updateSample(index, { positions: value });
      return $.evolve({ revision: (n) => n + 1 });
    },
    UpdateSampleSegmentation: ($, { index, value }) => {
      studioStoreActions.updateSample(index, { segmentation: value });
      return $.evolve({ revision: (n) => n + 1 });
    },
    UpdateSampleSignal: ($, { index, value }) => {
      studioStoreActions.updateSample(index, { signal: value });
      return $.evolve({ revision: (n) => n + 1 });
    },
  },
  subscriptions: ({ props, model }) => [
    studioAtomsSubscription(
      "metadata-samples-wizard",
      [studioWizardAtom],
      MetadataSamplesMsg.WizardChanged(),
    ),
    !props.hasExplicitCatalog &&
      model.sourceJson !== null &&
      Subscription.make("metadata-samples-scan", model.sourceJson, (key) =>
        Stream.callback<typeof MetadataSamplesMsg.Type>((queue) => {
          const atom = scanSourceAtom(key);
          const unsub = studioRegistry.subscribe(
            atom,
            () => {
              Queue.offerUnsafe(queue, MetadataSamplesMsg.ScanChanged());
            },
            { immediate: true },
          );
          return Effect.addFinalizer(() => Effect.sync(unsub));
        }),
      ),
  ],
  view: (h, model) => {
    const wizard = studioRegistry.get(studioWizardAtom);
    const catalog = resolveCatalog(
      h.props.hasExplicitCatalog,
      h.props.explicitCatalog as PositionCatalog | null,
    );
    const resolvedPreview = catalog
      ? formatResolvedPreview(collectAssayPositions({ samples: wizard.samples }), catalog)
      : null;

    const tooltipProps = (id: string) => ({
      tooltipOpen: model.openTooltipId === id,
      onTooltipOpenChange: (open: boolean) =>
        MetadataSamplesMsg.SetTooltipOpen({ tooltipId: open ? id : null }),
    });

    return h.section
      .attr("aria-labelledby", "studio-samples-title")
      .class("flex w-full max-w-[640px] min-w-0 flex-col gap-6")
      .children(
        h.div
          .class("flex flex-col gap-2")
          .children(
            h.h2
              .id("studio-samples-title")
              .class("text-2xl font-semibold leading-8 tracking-[-0.02em]")
              .children("Samples"),
            h.p
              .class("text-[13px] leading-[18px] text-muted-foreground")
              .children(
                "Each card is one sample: a unique name and the positions it covers. Set the segmentation and signal channels once for the assay. A card can override them. Position numbers follow the source labels (folder names, or NIS/ZEN 1-based names). Jupyter reads these cards from the saved assay after Align. It does not ask for the list again.",
              ),
            model.encodingError
              ? h.p
                  .attr("role", "alert")
                  .class("text-[13px] leading-[18px] text-destructive")
                  .children(model.encodingError)
              : undefined,
            resolvedPreview
              ? h.p
                  .attr("data-testid", "resolved-positions")
                  .class("font-mono text-[13px] leading-[18px] text-foreground")
                  .children(resolvedPreview)
              : undefined,
          ),
        h.div.class("grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2").children(
          SampleField(h, {
            fieldId: "studio-assay-segmentation-channel",
            label: "Segmentation channel",
            hint: "Channel used to find cells. Used for every sample unless a card overrides it.",
            ...tooltipProps("assay-seg"),
            child: Input(h, {
              id: "studio-assay-segmentation-channel",
              ariaLabel: "Segmentation channel",
              class: "h-8 w-full px-3 font-mono text-[13px]",
              name: "assay-segmentation-channel",
              value: wizard.segmentationChannel,
              onInput: (value) => MetadataSamplesMsg.SetAssaySegmentationChannel({ value }),
            })
              .attr("autocomplete", "off")
              .attr("inputmode", "numeric"),
          }),
          SampleField(h, {
            fieldId: "studio-assay-signal-channel",
            label: "Signal channel",
            hint: "Channel measured for intensity. Separate extra channels with a comma. Used for every sample unless a card overrides it.",
            ...tooltipProps("assay-sig"),
            child: Input(h, {
              id: "studio-assay-signal-channel",
              ariaLabel: "Signal channel",
              class: "h-8 w-full px-3 font-mono text-[13px]",
              name: "assay-signal-channel",
              value: wizard.signalChannel,
              onInput: (value) => MetadataSamplesMsg.SetAssaySignalChannel({ value }),
            }).attr("autocomplete", "off"),
          }),
        ),
        h.div
          .class(
            "grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-4",
          )
          .children(
            ...wizard.samples.map((row, index) => {
              const positionsId = `studio-sample-${row.id}-positions`;
              const segId = `studio-sample-${row.id}-seg`;
              const sigId = `studio-sample-${row.id}-sig`;
              return Card(h, { class: "min-w-0", size: "sm" })
                .key(row.id)
                .attr("aria-label", `Sample ${index + 1}`)
                .attr("role", "article")
                .children(
                  CardContent(h, { class: "flex flex-col gap-4" }).children(
                    h.div.class("flex flex-col gap-1.5").children(
                      h.div.class("flex items-center justify-between gap-2").children(
                        h.span
                          .class(
                            "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
                          )
                          .children("Name"),
                        Button(h, {
                          ariaLabel: "Remove sample",
                          class: "size-6",
                          size: "icon-xs",
                          type: "button",
                          variant: "ghost",
                          onPress: MetadataSamplesMsg.RemoveSample({ index }),
                        }).children(Icon(h, "trash")),
                      ),
                      Input(h, {
                        ariaLabel: "Name",
                        class: "h-8 w-full min-w-0 px-3 text-[13px]",
                        name: `samples.${index}.name`,
                        value: row.name,
                        onInput: (value) => MetadataSamplesMsg.UpdateSampleName({ index, value }),
                      }).attr("autocomplete", "off"),
                    ),
                    SampleField(h, {
                      fieldId: positionsId,
                      label: "Positions",
                      hint: "Type the source labels, for example 1-67 or 138, 144. Counting matches the folder names or NIS/ZEN position names.",
                      ...tooltipProps(`pos-${row.id}`),
                      child: SamplePositionsInputComponent(h, {
                        key: `positions-input-${row.id}`,
                        props: {
                          catalog: catalog
                            ? {
                                kind: catalog.kind,
                                ids: [...catalog.ids],
                                labels: [...catalog.labels],
                              }
                            : null,
                          id: positionsId,
                          name: `samples.${index}.positions`,
                          value: row.positions,
                        },
                        onEmit: {
                          Changed: ({ positions }) =>
                            MetadataSamplesMsg.UpdateSamplePositions({ index, value: positions }),
                        },
                      }),
                    }),
                    catalog
                      ? PositionCheckboxList(h, {
                          catalog,
                          sampleIndex: index,
                          value: row.positions,
                          onChange: (positions) =>
                            MetadataSamplesMsg.UpdateSamplePositions({ index, value: positions }),
                        })
                      : undefined,
                    SampleField(h, {
                      fieldId: segId,
                      label: "Segmentation channel",
                      hint: "Override for this sample only. Leave empty to use the assay segmentation channel.",
                      ...tooltipProps(`seg-${row.id}`),
                      child: Input(h, {
                        id: segId,
                        ariaLabel: "Segmentation channel",
                        class: "h-8 w-full px-3 font-mono text-[13px]",
                        name: `samples.${index}.segmentation-channel`,
                        value: row.segmentation,
                        onInput: (value) =>
                          MetadataSamplesMsg.UpdateSampleSegmentation({ index, value }),
                      })
                        .attr("autocomplete", "off")
                        .attr("inputmode", "numeric"),
                    }),
                    SampleField(h, {
                      fieldId: sigId,
                      label: "Signal channel",
                      hint: "Override for this sample only. Leave empty to use the assay signal channel. Separate extra channels with a comma.",
                      ...tooltipProps(`sig-${row.id}`),
                      child: Input(h, {
                        id: sigId,
                        ariaLabel: "Signal channel",
                        class: "h-8 w-full px-3 font-mono text-[13px]",
                        name: `samples.${index}.signal-channels`,
                        value: row.signal,
                        onInput: (value) => MetadataSamplesMsg.UpdateSampleSignal({ index, value }),
                      }).attr("autocomplete", "off"),
                    }),
                  ),
                );
            }),
          ),
        Button(h, {
          class: "w-full justify-center",
          type: "button",
          variant: "outline",
          onPress: MetadataSamplesMsg.AddSample(),
        }).children("Add sample"),
      );
  },
});

export type MetadataSamplesOptions = {
  readonly key?: string | undefined;
  readonly catalog?: PositionCatalog | null | undefined;
};

export function MetadataSamples<M>(h: Html.H<M>, options: MetadataSamplesOptions = {}) {
  const hasExplicitCatalog = options.catalog !== undefined;
  return MetadataSamplesComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      hasExplicitCatalog,
      explicitCatalog: options.catalog
        ? {
            kind: options.catalog.kind,
            ids: [...options.catalog.ids],
            labels: [...options.catalog.labels],
          }
        : null,
    },
  });
}
