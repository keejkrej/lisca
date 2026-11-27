import { Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AnnotationLabel, ContrastWindow } from "@lisca/contracts";
import {
  LabelCreationDialog,
  type AnnotationControlValue,
  type AnnotationMode,
  type AnnotationTool,
  type RoiFrameSelection,
} from "@lisca/instrument";
import { AppShell } from "@lisca/ui/shell";
import { Effect, Queue, Schema, Stream } from "effect";

import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { StudioAnnotateInstrumentStack } from "../components/studio-annotate-instrument-stack";
import { StudioAnnotateMain } from "../components/studio-annotate-main";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { StudioNavigationMessage, StudioNavigationProvider } from "../navigation/studio-router";
import { studioCommandShortcutSubscription } from "../navigation/use-studio-command-shortcut";
import {
  disposeStudioAnnotatePageController,
  getOrCreateStudioAnnotatePageController,
  nextStudioAnnotateInstanceId,
} from "../state/studio-annotate-page-context";
import {
  selectStudioAnnotateDock,
  selectStudioAnnotateShell,
} from "../state/studio-annotate-page-selectors";
import { studioAtomsSubscription, studioRegistry } from "../state/studio-registry";

const AnnotatePageMessage = UiSchema.TaggedEnum({
  Updated: {},
  Navigate: { to: Schema.String },
  ChangeSelection: { patch: Schema.Any },
  SetContrast: { contrast: Schema.Any },
  SetContrastLocked: { locked: Schema.Boolean },
  SetMode: { mode: Schema.Any },
  SetTool: { tool: Schema.Any },
  SetOverlayOpacity: { value: Schema.Number },
  SetBrushSize: { value: Schema.Number },
  SetActiveLabelId: { id: Schema.String },
  OpenLabelDialog: {},
  SetLabelDialogOpen: { open: Schema.Boolean },
  SaveLabels: { labels: Schema.Any },
  Undo: {},
  Redo: {},
  Discard: {},
  CommitAnnotation: { value: Schema.Any },
  MaskCommit: { mask: Schema.Any },
  SmartSegmentClick: { x: Schema.Number, y: Schema.Number, negative: Schema.Boolean },
  SmartEraseClick: { x: Schema.Number, y: Schema.Number },
  Save: {},
  GoBack: {},
  GoNext: {},
  Analyze: {},
});

export const AnnotatePage = Html.component({
  name: "AnnotatePage",
  props: Schema.Struct({}),
  model: Schema.Struct({
    instanceId: Schema.String,
    version: Schema.Number,
  }),
  message: AnnotatePageMessage,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({
    instanceId: nextStudioAnnotateInstanceId(),
    version: 0,
  }),
  update: {
    Updated: ($) => $.evolve({ version: (v) => v + 1 }),
    Navigate: ($, { to }) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to })),
    ChangeSelection: ($, { patch }) => {
      const state = getOrCreateStudioAnnotatePageController($.model.instanceId).getState();
      state.changeSelection(() => state.setSelection(patch as Partial<RoiFrameSelection>));
      return $.evolve({ version: (v) => v + 1 });
    },
    SetContrast: ($, { contrast }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .setContrast(contrast as ContrastWindow | null);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetContrastLocked: ($, { locked }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .setContrastLocked(locked);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetMode: ($, { mode }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .setMode(mode as AnnotationMode);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetTool: ($, { tool }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .setTool(tool as AnnotationTool);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetOverlayOpacity: ($, { value }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .setOverlayOpacity(value);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetBrushSize: ($, { value }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId).getState().setBrushSize(value);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetActiveLabelId: ($, { id }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId).getState().setActiveLabelId(id);
      return $.evolve({ version: (v) => v + 1 });
    },
    OpenLabelDialog: ($) => {
      const state = getOrCreateStudioAnnotatePageController($.model.instanceId).getState();
      state.setLabelError(null);
      state.setLabelDialogOpen(true);
      return $.evolve({ version: (v) => v + 1 });
    },
    SetLabelDialogOpen: ($, { open }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .setLabelDialogOpen(open);
      return $.evolve({ version: (v) => v + 1 });
    },
    SaveLabels: ($, { labels }) => {
      void getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .handleSaveLabels(labels as AnnotationLabel[]);
      return $.evolve({ version: (v) => v + 1 });
    },
    Undo: ($) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId).getState().annotation.undo();
      return $.evolve({ version: (v) => v + 1 });
    },
    Redo: ($) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId).getState().annotation.redo();
      return $.evolve({ version: (v) => v + 1 });
    },
    Discard: ($) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId).getState().annotation.discard();
      return $.evolve({ version: (v) => v + 1 });
    },
    CommitAnnotation: ($, { value }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .annotation.commit(value as AnnotationControlValue);
      return $.evolve({ version: (v) => v + 1 });
    },
    MaskCommit: ($, { mask }) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getContext()
        .onMaskCommit(mask as Uint8Array);
      return $.evolve({ version: (v) => v + 1 });
    },
    SmartSegmentClick: ($, { x, y, negative }) => {
      void getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getContext()
        .smartSegment.handleClick({ x, y, negative });
      return $.evolve({ version: (v) => v + 1 });
    },
    SmartEraseClick: ($, { x, y }) => {
      void getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getContext()
        .smartSegment.handleEraseClick({ x, y });
      return $.evolve({ version: (v) => v + 1 });
    },
    Save: ($) => {
      void getOrCreateStudioAnnotatePageController($.model.instanceId).getState().handleSave();
      return $.evolve({ version: (v) => v + 1 });
    },
    GoBack: ($) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId).getState().goToPreviousSite();
      return $.evolve({ version: (v) => v + 1 });
    },
    GoNext: ($) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId).getState().goToNextSite();
      return $.evolve({ version: (v) => v + 1 });
    },
    Analyze: ($) => {
      getOrCreateStudioAnnotatePageController($.model.instanceId)
        .getState()
        .requestContinueToAnalysis();
      return $.evolve({ version: (v) => v + 1 });
    },
  },
  subscriptions: ({ model }) => {
    const controller = getOrCreateStudioAnnotatePageController(model.instanceId);
    const state = controller.getState();
    const dock = selectStudioAnnotateDock(state);
    const disableContinue =
      dock.frameLoading || !dock.request || dock.analysisBusy || dock.workspaceMissing;

    return [
      Subscription.make("studio-annotate-controller", model.instanceId, (instanceId) =>
        Stream.callback<typeof AnnotatePageMessage.Type>((queue) => {
          const active = getOrCreateStudioAnnotatePageController(instanceId);
          active.setNavigate((to) => {
            Queue.offerUnsafe(queue, AnnotatePageMessage.Navigate({ to }));
          });
          const unsubscribe = active.subscribe(() => {
            Queue.offerUnsafe(queue, AnnotatePageMessage.Updated());
          });
          return Effect.addFinalizer(() =>
            Effect.sync(() => {
              unsubscribe();
              disposeStudioAnnotatePageController(instanceId);
            }),
          );
        }),
      ),
      studioAtomsSubscription<typeof AnnotatePageMessage.Type>(
        "studio-annotate-expert",
        [studioExpertModeAtom],
        AnnotatePageMessage.Updated(),
      ),
      studioCommandShortcutSubscription<typeof AnnotatePageMessage.Type>(
        "save",
        dock.canSave && !dock.saving,
        AnnotatePageMessage.Save(),
      ),
      studioCommandShortcutSubscription<typeof AnnotatePageMessage.Type>(
        "back",
        dock.canGoToPreviousSite,
        AnnotatePageMessage.GoBack(),
      ),
      studioCommandShortcutSubscription<typeof AnnotatePageMessage.Type>(
        "next",
        dock.canGoToNextSite,
        AnnotatePageMessage.GoNext(),
      ),
      studioCommandShortcutSubscription<typeof AnnotatePageMessage.Type>(
        "analyze",
        !disableContinue,
        AnnotatePageMessage.Analyze(),
      ),
    ];
  },
  view: (h, model) => {
    const controller = getOrCreateStudioAnnotatePageController(model.instanceId);
    const ctx = controller.getContext();
    const { state } = ctx;
    const shell = selectStudioAnnotateShell(state);
    const expertMode = studioRegistry.get(studioExpertModeAtom);

    return AppShell(h, {
      key: "annotate-shell",
      leftWidthClass: "w-rail",
      left: StudioLeft(h, { key: "studio-left" }),
      topBar: StudioTopBar(h, { key: "studio-top-bar", showExpert: true }),
      main: [
        StudioAnnotateMain(h, {
          state,
          smartSegmentState: ctx.smartSegmentState,
          smartSegmentStatus: ctx.smartSegmentStatus,
          smartSegmentError: ctx.smartSegmentError,
          onNavigate: (to) => AnnotatePageMessage.Navigate({ to }),
          onMaskCommit: (mask) => AnnotatePageMessage.MaskCommit({ mask }),
          onSmartSegmentClick: (click) => AnnotatePageMessage.SmartSegmentClick(click),
          onSmartEraseClick: (click) => AnnotatePageMessage.SmartEraseClick(click),
        }),
        LabelCreationDialog(h, {
          key: "annotate-label-dialog",
          error: shell.labelError,
          labels: shell.labels,
          open: shell.labelDialogOpen,
          saving: shell.saveLabelsPending,
          workspacePath: shell.workspacePath,
          onOpenChange: (open) => AnnotatePageMessage.SetLabelDialogOpen({ open }),
          onSave: (labels) => AnnotatePageMessage.SaveLabels({ labels }),
        }),
      ],
      rightWidthClass: "w-rail",
      right: StudioRightPanel(h, {
        key: "studio-right-panel",
        expertMode,
        children: StudioAnnotateInstrumentStack(h, {
          state,
          expertMode,
          onSelectionChange: (patch) => AnnotatePageMessage.ChangeSelection({ patch }),
          onContrastChange: (contrast) => AnnotatePageMessage.SetContrast({ contrast }),
          onContrastLockedChange: (locked) => AnnotatePageMessage.SetContrastLocked({ locked }),
          onModeChange: (mode) => AnnotatePageMessage.SetMode({ mode }),
          onToolChange: (tool) => AnnotatePageMessage.SetTool({ tool }),
          onOverlayOpacityChange: (value) => AnnotatePageMessage.SetOverlayOpacity({ value }),
          onBrushSizeChange: (value) => AnnotatePageMessage.SetBrushSize({ value }),
          onActiveLabelIdChange: (id) => AnnotatePageMessage.SetActiveLabelId({ id }),
          onOpenLabelDialog: AnnotatePageMessage.OpenLabelDialog(),
          onUndo: AnnotatePageMessage.Undo(),
          onRedo: AnnotatePageMessage.Redo(),
          onDiscard: AnnotatePageMessage.Discard(),
          onCommitAnnotation: (value) => AnnotatePageMessage.CommitAnnotation({ value }),
          onSave: AnnotatePageMessage.Save(),
          onBack: AnnotatePageMessage.GoBack(),
          onNext: AnnotatePageMessage.GoNext(),
          onAnalyze: AnnotatePageMessage.Analyze(),
        }),
      }),
    });
  },
});
