import { Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type {
  AlignGridPatternCoord,
  AlignGridShape,
  AlignGridState,
  ContrastWindow,
  FrameRequest,
} from "@lisca/contracts";
import { studioAlignPositionNav } from "@lisca/client/studio/source";
import { AppShell } from "@lisca/ui/shell";
import type { AlignGridToolMode } from "@lisca/utils";
import { Effect, Queue, Schema, Stream } from "effect";

import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { StudioAlignInstrumentStack } from "../components/studio-align-instrument-stack";
import { StudioAlignMain } from "../components/studio-align-main";
import { StudioAlignVariationExcludeDialog } from "../components/studio-align-variation-exclude-dialog";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { StudioNavigationMessage, StudioNavigationProvider } from "../navigation/studio-router";
import { studioCommandShortcutSubscription } from "../navigation/use-studio-command-shortcut";
import {
  disposeStudioAlignPageController,
  getOrCreateStudioAlignPageController,
  nextStudioAlignInstanceId,
} from "../state/studio-align-page-provider";
import { studioAtomsSubscription, studioRegistry } from "../state/studio-registry";

const AlignPageMessage = UiSchema.TaggedEnum({
  Updated: {},
  Navigate: { to: Schema.String },
  ChangePosition: { pos: Schema.Number },
  SetSelection: { patch: Schema.Any },
  SetContrast: { contrast: Schema.Any },
  SetContrastLocked: { locked: Schema.Boolean },
  DetectGrid: { shape: Schema.optional(Schema.Any) },
  SetGrid: { grid: Schema.Any },
  AdjustTranslation: { dx: Schema.Number, dy: Schema.Number },
  ClearDrift: {},
  ClearKeyframe: {},
  SetDriftDelta: { dx: Schema.Number, dy: Schema.Number },
  SetKeyframe: {},
  SetReference: {},
  SetToolMode: { mode: Schema.Any },
  SetSpacingZoomLocked: { locked: Schema.Boolean },
  SetPatternZoomLocked: { locked: Schema.Boolean },
  SetManualExclusionEnabled: { enabled: Schema.Boolean },
  SetExcludedPatterns: { patterns: Schema.Any },
  RequestVarExclude: {},
  ApplyVarExclude: {},
  CancelVarExclude: {},
  SetVarExcludeThreshold: { threshold: Schema.Number },
  Save: {},
  GoBack: {},
  GoNext: {},
  RequestCrop: {},
  ResolveUnsavedChanges: { choice: Schema.Literals(["save", "discard", "cancel"]) },
  CancelCropStart: {},
  StartConfirmedCrop: {},
  GoToUnaligned: {},
  CancelCropConfirm: {},
  SkipExistingCrop: {},
  ConfirmCropOverwrite: {},
});

export const AlignPage = Html.component({
  name: "AlignPage",
  props: Schema.Struct({}),
  model: Schema.Struct({
    instanceId: Schema.String,
    version: Schema.Number,
  }),
  message: AlignPageMessage,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({
    instanceId: nextStudioAlignInstanceId(),
    version: 0,
  }),
  update: {
    Updated: ($) => $.evolve({ version: (v) => v + 1 }),
    Navigate: ($, { to }) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to })),
    ChangePosition: ($, { pos }) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().changePosition(pos);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetSelection: ($, { patch }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setSelection(patch as Partial<FrameRequest>);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetContrast: ($, { contrast }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setContrast(contrast as ContrastWindow | null);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetContrastLocked: ($, { locked }) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().setContrastLocked(locked);
      return $.evolve({ version: (v) => v + 1 });
    },
    DetectGrid: ($, { shape }) => {
      void getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .detectGrid(shape as AlignGridShape | undefined);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetGrid: ($, { grid }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setGrid(grid as AlignGridState);
      return $.evolve({ version: (v) => v + 1 });
    },
    AdjustTranslation: ($, { dx, dy }) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().adjustTranslation(dx, dy);
      return $.evolve({ version: (v) => v + 1 });
    },
    ClearDrift: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().clearDrift();
      return $.evolve({ version: (v) => v + 1 });
    },
    ClearKeyframe: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().clearKeyframe();
      return $.evolve({ version: (v) => v + 1 });
    },
    SetDriftDelta: ($, { dx, dy }) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().setDriftDelta(dx, dy);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetKeyframe: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().setKeyframe();
      return $.evolve({ version: (v) => v + 1 });
    },
    SetReference: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().setReference();
      return $.evolve({ version: (v) => v + 1 });
    },
    SetToolMode: ($, { mode }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setToolMode(mode as AlignGridToolMode);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetSpacingZoomLocked: ($, { locked }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setSpacingZoomLocked(locked);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetPatternZoomLocked: ($, { locked }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setPatternZoomLocked(locked);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetManualExclusionEnabled: ($, { enabled }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setManualExclusionEnabled(enabled);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetExcludedPatterns: ($, { patterns }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setExcludedPatternsForCurrentPosition(patterns as AlignGridPatternCoord[]);
      return $.evolve({ version: (v) => v + 1 });
    },
    RequestVarExclude: ($) => {
      void getOrCreateStudioAlignPageController($.model.instanceId)
        .getContext()
        .requestVarExclude();
      return $.evolve({ version: (v) => v + 1 });
    },
    ApplyVarExclude: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getContext().applyExcludePreview();
      return $.evolve({ version: (v) => v + 1 });
    },
    CancelVarExclude: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getContext().cancelExcludePreview();
      return $.evolve({ version: (v) => v + 1 });
    },
    SetVarExcludeThreshold: ($, { threshold }) => {
      getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .setVariationExcludeThreshold(threshold);
      return $.evolve({ version: (v) => v + 1 });
    },
    Save: ($) => {
      void getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .saveCurrentPosition();
      return $.evolve({ version: (v) => v + 1 });
    },
    GoBack: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().goBack();
      return $.evolve({ version: (v) => v + 1 });
    },
    GoNext: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().goNext();
      return $.evolve({ version: (v) => v + 1 });
    },
    RequestCrop: ($) => {
      void getOrCreateStudioAlignPageController($.model.instanceId).getState().requestCrop();
      return $.evolve({ version: (v) => v + 1 });
    },
    ResolveUnsavedChanges: ($, { choice }) => {
      void getOrCreateStudioAlignPageController($.model.instanceId)
        .getState()
        .resolveUnsavedChanges(choice);
      return $.evolve({ version: (v) => v + 1 });
    },
    CancelCropStart: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().cancelCropStartConfirm();
      return $.evolve({ version: (v) => v + 1 });
    },
    StartConfirmedCrop: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().startConfirmedCrop();
      return $.evolve({ version: (v) => v + 1 });
    },
    GoToUnaligned: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().goToUnalignedPosition();
      return $.evolve({ version: (v) => v + 1 });
    },
    CancelCropConfirm: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().cancelCropConfirm();
      return $.evolve({ version: (v) => v + 1 });
    },
    SkipExistingCrop: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().skipExistingCrop();
      return $.evolve({ version: (v) => v + 1 });
    },
    ConfirmCropOverwrite: ($) => {
      getOrCreateStudioAlignPageController($.model.instanceId).getState().confirmCropOverwrite();
      return $.evolve({ version: (v) => v + 1 });
    },
  },
  subscriptions: ({ model }) => {
    const controller = getOrCreateStudioAlignPageController(model.instanceId);
    const state = controller.getState();
    const busy = state.saving || state.preparingCrop || state.cropping;
    const frameReady = Boolean(state.frame);
    const positionNav = studioAlignPositionNav(state.alignPositions, state.selection.pos);

    return [
      Subscription.make("studio-align-controller", model.instanceId, (instanceId) =>
        Stream.callback<typeof AlignPageMessage.Type>((queue) => {
          const active = getOrCreateStudioAlignPageController(instanceId);
          active.setNavigate((to) => {
            Queue.offerUnsafe(queue, AlignPageMessage.Navigate({ to }));
          });
          const unsubscribe = active.subscribe(() => {
            Queue.offerUnsafe(queue, AlignPageMessage.Updated());
          });
          return Effect.addFinalizer(() =>
            Effect.sync(() => {
              unsubscribe();
              disposeStudioAlignPageController(instanceId);
            }),
          );
        }),
      ),
      studioAtomsSubscription<typeof AlignPageMessage.Type>(
        "studio-align-expert",
        [studioExpertModeAtom],
        AlignPageMessage.Updated(),
      ),
      studioCommandShortcutSubscription<typeof AlignPageMessage.Type>(
        "save",
        !busy && frameReady,
        AlignPageMessage.Save(),
      ),
      studioCommandShortcutSubscription<typeof AlignPageMessage.Type>(
        "back",
        !busy && positionNav.canGoBack,
        AlignPageMessage.GoBack(),
      ),
      studioCommandShortcutSubscription<typeof AlignPageMessage.Type>(
        "next",
        !busy && positionNav.canGoNext,
        AlignPageMessage.GoNext(),
      ),
      studioCommandShortcutSubscription<typeof AlignPageMessage.Type>(
        "crop",
        !busy && frameReady,
        AlignPageMessage.RequestCrop(),
      ),
    ];
  },
  view: (h, model) => {
    const controller = getOrCreateStudioAlignPageController(model.instanceId);
    const ctx = controller.getContext();
    const { state } = ctx;
    const expertMode = studioRegistry.get(studioExpertModeAtom);

    const stackProps = {
      state,
      varExcludeActive: ctx.excludeActive(),
      onChangePosition: (pos: number) => AlignPageMessage.ChangePosition({ pos }),
      onSelectionChange: (patch: Partial<FrameRequest>) => AlignPageMessage.SetSelection({ patch }),
      onContrastChange: (contrast: ContrastWindow | null) =>
        AlignPageMessage.SetContrast({ contrast }),
      onContrastLockedChange: (locked: boolean) => AlignPageMessage.SetContrastLocked({ locked }),
      onDetectGrid: (shape?: AlignGridShape) =>
        AlignPageMessage.DetectGrid(shape !== undefined ? { shape } : {}),
      onGridChange: (grid: AlignGridState) => AlignPageMessage.SetGrid({ grid }),
      onTranslationDelta: (dx: number, dy: number) =>
        AlignPageMessage.AdjustTranslation({ dx, dy }),
      onClearDrift: AlignPageMessage.ClearDrift(),
      onClearKeyframe: AlignPageMessage.ClearKeyframe(),
      onDeltaChange: (dx: number, dy: number) => AlignPageMessage.SetDriftDelta({ dx, dy }),
      onSetKeyframe: AlignPageMessage.SetKeyframe(),
      onSetReference: AlignPageMessage.SetReference(),
      onToolModeChange: (mode: AlignGridToolMode) => AlignPageMessage.SetToolMode({ mode }),
      onSpacingZoomLockedChange: (locked: boolean) =>
        AlignPageMessage.SetSpacingZoomLocked({ locked }),
      onPatternZoomLockedChange: (locked: boolean) =>
        AlignPageMessage.SetPatternZoomLocked({ locked }),
      onManualExclusionEnabledChange: (enabled: boolean) =>
        AlignPageMessage.SetManualExclusionEnabled({ enabled }),
      onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) =>
        AlignPageMessage.SetExcludedPatterns({ patterns }),
      onVariationExclude: AlignPageMessage.RequestVarExclude(),
      onApplyVariationExclude: AlignPageMessage.ApplyVarExclude(),
      onCancelVariationExclude: AlignPageMessage.CancelVarExclude(),
      onVariationExcludeThresholdChange: (threshold: number) =>
        AlignPageMessage.SetVarExcludeThreshold({ threshold }),
      onSave: AlignPageMessage.Save(),
      onBack: AlignPageMessage.GoBack(),
      onNext: AlignPageMessage.GoNext(),
      onCrop: AlignPageMessage.RequestCrop(),
    };

    return AppShell(h, {
      key: "align-shell",
      leftWidthClass: "w-rail",
      left: StudioLeft(h, { key: "studio-left" }),
      topBar: StudioTopBar(h, { key: "studio-top-bar", showExpert: true }),
      main: [
        ...StudioAlignMain(h, {
          state,
          pointer: ctx.pointer,
          visibleStatus: ctx.visibleStatus,
          onNavigate: (to) => AlignPageMessage.Navigate({ to }),
          onResolveUnsavedChanges: (choice) => AlignPageMessage.ResolveUnsavedChanges({ choice }),
          onCancelCropStart: AlignPageMessage.CancelCropStart(),
          onStartConfirmedCrop: AlignPageMessage.StartConfirmedCrop(),
          onGoToUnaligned: AlignPageMessage.GoToUnaligned(),
          onCancelCropConfirm: AlignPageMessage.CancelCropConfirm(),
          onSkipExistingCrop: AlignPageMessage.SkipExistingCrop(),
          onConfirmCropOverwrite: AlignPageMessage.ConfirmCropOverwrite(),
        }),
        StudioAlignVariationExcludeDialog(h, {
          state: state.variationExcludePreview,
          onApply: AlignPageMessage.ApplyVarExclude(),
          onCancel: AlignPageMessage.CancelVarExclude(),
          onThresholdChange: (threshold) => AlignPageMessage.SetVarExcludeThreshold({ threshold }),
        }),
      ],
      rightWidthClass: "w-rail",
      right: StudioRightPanel(h, {
        key: "studio-right-panel",
        expertMode,
        children: StudioAlignInstrumentStack(h, stackProps),
        expert: StudioAlignInstrumentStack(h, { ...stackProps, expert: true }),
      }),
    });
  },
});
