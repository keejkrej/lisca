import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AlignGridPatternCoordSchema } from "@lisca/contracts";
import { AlignSelectionRail } from "@lisca/instrument";
import {
  createVarExcludeController,
  type VarExcludeContext,
  type VarExcludeController,
} from "@lisca/smart/var-exclude";
import { createLocalVarExcludeProvider } from "@lisca/smart/var-exclude/local";
import { createDefaultAlignGrid } from "@lisca/utils";
import { Effect, Queue, Schema, Stream } from "effect";

import { AlignPageStore, getAlignerState } from "../state/align-page-context";

let nextVarExcludeCounter = 0;
const varExcludeControllers = new Map<string, VarExcludeController>();

function buildVarExcludeContext(controllerId: string): VarExcludeContext {
  const state = getAlignerState(controllerId);
  if (!state) {
    return {
      frame: null,
      grid: createDefaultAlignGrid(),
      currentExcludedPatterns: [],
      enabled: false,
    };
  }
  return {
    frame: state.frame,
    grid: state.effectiveGrid,
    currentExcludedPatterns: state.currentExcludedPatterns,
    enabled: Boolean(state.frame),
  };
}

function createSelectionVarExclude(controllerId: string): string {
  nextVarExcludeCounter += 1;
  const id = `aligner-var-exclude-${nextVarExcludeCounter}`;
  const controller = createVarExcludeController({
    provider: createLocalVarExcludeProvider(),
    initialContext: buildVarExcludeContext(controllerId),
    onPreview: (preview) => getAlignerState(controllerId)?.showVariationExcludePreview(preview),
    onError: (error) => getAlignerState(controllerId)?.reportError(error),
  });
  varExcludeControllers.set(id, controller);
  return id;
}

const AlignSelectionControlsMessage = UiSchema.TaggedEnum({
  VarExcludeChanged: {},
  SetManualExclusionEnabled: { enabled: Schema.Boolean },
  SetExcludedPatterns: { patterns: Schema.Array(AlignGridPatternCoordSchema) },
  RequestVariationExclude: {},
  ApplyVariationExclude: {},
  CancelVariationExclude: {},
  SetVariationExcludeThreshold: { threshold: Schema.Number },
});

const AlignSelectionControlsInner = Html.component({
  name: "AlignSelectionControlsInner",
  props: Schema.Struct({
    controllerId: Schema.String,
    version: Schema.Number,
  }),
  model: Schema.Struct({
    varExcludeId: Schema.String,
    varExcludeVersion: Schema.Number,
  }),
  message: AlignSelectionControlsMessage,
}).make({
  init: ($) => ({
    varExcludeId: createSelectionVarExclude($.props.controllerId),
    varExcludeVersion: 0,
  }),
  update: {
    VarExcludeChanged: ($) => $.evolve({ varExcludeVersion: (v) => v + 1 }),
    SetManualExclusionEnabled: ($, { enabled }) => {
      getAlignerState($.props.controllerId)?.setManualExclusionEnabled(enabled);
      return $.model;
    },
    SetExcludedPatterns: ($, { patterns }) => {
      getAlignerState($.props.controllerId)?.setExcludedPatternsForCurrentPosition(patterns);
      return $.model;
    },
    RequestVariationExclude: ($) => {
      const controller = varExcludeControllers.get($.model.varExcludeId);
      if (!controller) return $.model;
      controller.sync(buildVarExcludeContext($.props.controllerId));
      void controller.requestPreview();
      return $.model;
    },
    ApplyVariationExclude: ($) => {
      getAlignerState($.props.controllerId)?.applyVariationExclude();
      return $.model;
    },
    CancelVariationExclude: ($) => {
      getAlignerState($.props.controllerId)?.cancelVariationExclude();
      return $.model;
    },
    SetVariationExcludeThreshold: ($, { threshold }) => {
      getAlignerState($.props.controllerId)?.setVariationExcludeThreshold(threshold);
      return $.model;
    },
  },
  subscriptions: ({ model, props }) => [
    Subscription.make("aligner-var-exclude", model.varExcludeId, (varExcludeId) =>
      Stream.callback<typeof AlignSelectionControlsMessage.Type>((queue) => {
        const controller = varExcludeControllers.get(varExcludeId);
        if (!controller) return Effect.void;
        const unsubscribe = controller.subscribe(() => {
          Queue.offerUnsafe(queue, AlignSelectionControlsMessage.VarExcludeChanged());
        });
        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            unsubscribe();
            controller.dispose();
            varExcludeControllers.delete(varExcludeId);
          }),
        );
      }),
    ),
    Subscription.make(
      "aligner-var-exclude-sync",
      [model.varExcludeId, props.controllerId, props.version] as const,
      ([varExcludeId, controllerId]) =>
        Stream.unwrap(
          Effect.sync(() => {
            varExcludeControllers.get(varExcludeId)?.sync(buildVarExcludeContext(controllerId));
            return Stream.empty;
          }),
        ),
    ),
  ],
  view: (h, model) => {
    void h.props.version;
    void model.varExcludeVersion;
    const state = getAlignerState(h.props.controllerId);
    const varExclude = varExcludeControllers.get(model.varExcludeId);
    if (!state) return View.text("");

    const disabled = !state.frame;

    return AlignSelectionRail(h, {
      key: "align-selection-rail",
      disabled,
      excludedPatterns: state.currentExcludedPatterns,
      frame: state.frame,
      grid: state.effectiveGrid,
      manualExclusionEnabled: state.manualExclusionEnabled,
      sectionAppearance: "rail",
      visibleCounts: state.visibleCounts,
      variationExcludeLoading: varExclude?.isActive() ?? false,
      variationExcludePreview: state.variationExcludePreview,
      onApplyVariationExclude: AlignSelectionControlsMessage.ApplyVariationExclude(),
      onCancelVariationExclude: AlignSelectionControlsMessage.CancelVariationExclude(),
      onExcludedPatternsChange: (patterns) =>
        AlignSelectionControlsMessage.SetExcludedPatterns({ patterns }),
      onManualExclusionEnabledChange: (enabled) =>
        AlignSelectionControlsMessage.SetManualExclusionEnabled({ enabled }),
      onVariationExclude: AlignSelectionControlsMessage.RequestVariationExclude(),
      onVariationExcludeThresholdChange: (threshold) =>
        AlignSelectionControlsMessage.SetVariationExcludeThreshold({ threshold }),
    });
  },
});

export const AlignSelectionControls = Html.component({
  name: "AlignSelectionControls",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
  reads: {
    alignPage: AlignPageStore,
  },
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    AlignSelectionControlsInner(h, {
      key: h.reads.alignPage.controllerId,
      props: {
        controllerId: h.reads.alignPage.controllerId,
        version: h.reads.alignPage.version,
      },
    }),
});
