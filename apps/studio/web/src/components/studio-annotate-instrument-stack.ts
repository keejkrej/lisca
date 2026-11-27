import type { View } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import type { ContrastWindow } from "@lisca/contracts";
import {
  AnnotationControlRail,
  AnnotationToolGrid,
  buildAnnotationToolActions,
  type AnnotationControlValue,
  type AnnotationMode,
  type AnnotationTool,
  type RoiFrameSelection,
} from "@lisca/instrument";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";

import {
  CommandShortcutHint,
  commandShortcutKeys,
} from "../navigation/use-studio-command-shortcut";
import {
  selectStudioAnnotateCanvas,
  selectStudioAnnotateDock,
  selectStudioAnnotateLabels,
  selectStudioAnnotateNav,
} from "../state/studio-annotate-page-selectors";
import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { StudioAnnotateNav } from "./studio-annotate-nav";

export type StudioAnnotateInstrumentStackOptions<M> = {
  readonly state: StudioAnnotateState;
  readonly expertMode: boolean;
  readonly onSelectionChange: (patch: Partial<RoiFrameSelection>) => M;
  readonly onContrastChange: (
    contrast: ContrastWindow | null,
    meta?: { readonly lock?: boolean },
  ) => M;
  readonly onContrastLockedChange: (locked: boolean) => M;
  readonly onModeChange: (mode: AnnotationMode) => M;
  readonly onToolChange: (tool: AnnotationTool) => M;
  readonly onOverlayOpacityChange: (value: number) => M;
  readonly onBrushSizeChange: (value: number) => M;
  readonly onActiveLabelIdChange: (id: string) => M;
  readonly onOpenLabelDialog: M;
  readonly onUndo: M;
  readonly onRedo: M;
  readonly onDiscard: M;
  readonly onCommitAnnotation: (value: AnnotationControlValue) => M;
  readonly onSave: M;
  readonly onBack: M;
  readonly onNext: M;
  readonly onAnalyze: M;
};

/**
 * Shared Studio Annotate instrument stack for basic and expert modes.
 * Rail order: Navigation → Contrast → Mode → Tool → Labels → Edit → Brush → Action.
 * Expert adds Position, ROI, and Z to Navigation. Contrast stays in both modes.
 * Action follows the rail vocabulary: Save → Back → Next → Analyze (primary, last).
 */
export function StudioAnnotateInstrumentStack<M>(
  h: Html.H<M>,
  options: StudioAnnotateInstrumentStackOptions<M>,
): View.Input<M> {
  const { state, expertMode } = options;
  const nav = selectStudioAnnotateNav(state);
  const canvas = selectStudioAnnotateCanvas(state);
  const dock = selectStudioAnnotateDock(state);
  const labels = selectStudioAnnotateLabels(state);

  const canEditTools = dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(dock.tool, () => {}, !canEditTools, {
    viewable: Boolean(canvas.frame),
  });

  const toolSection =
    dock.mode === "segmentation"
      ? PanelSection(h, {
          key: "annotate-tool-section",
          appearance: "rail",
          title: "Tool",
          children: AnnotationToolGrid(h, {
            key: "annotate-tool-grid",
            canEditTools,
            layout: "rail",
            shortcutsEnabled: dock.shortcutsEnabled,
            toolActions,
            onSelectTool: options.onToolChange,
          }),
        })
      : undefined;

  const controlSections = AnnotationControlRail(h, {
    key: "annotate-controls",
    insertAfterMode: toolSection,
    activeLabelId: labels.activeLabelId,
    annotation: {
      current: labels.annotation.current,
      dirty: labels.annotation.dirty,
      canUndo: labels.annotation.canUndo,
      canRedo: labels.annotation.canRedo,
      undo: options.onUndo,
      redo: options.onRedo,
      discard: options.onDiscard,
      commit: options.onCommitAnnotation,
    },
    annotationError: labels.annotationError,
    brushSize: labels.brushSize,
    canEdit: labels.canEdit,
    frame: labels.frame,
    frameError: labels.frameError,
    labels: labels.labels,
    mode: labels.mode,
    openLabelDialog: options.onOpenLabelDialog,
    overlayOpacity: labels.overlayOpacity,
    saveError: labels.saveError,
    scanError: labels.scanError,
    sectionAppearance: "rail",
    setActiveLabelId: options.onActiveLabelIdChange,
    setBrushSize: options.onBrushSizeChange,
    setMode: options.onModeChange,
    setOverlayOpacity: options.onOverlayOpacityChange,
    workspacePath: labels.workspacePath,
  });

  const disableContinue =
    dock.frameLoading || !dock.request || dock.analysisBusy || dock.workspaceMissing;

  const actionSection = PanelSection(h, {
    key: "annotate-action-section",
    appearance: "rail",
    title: "Action",
    children: RailControlStack(h).children(
      Button(h, {
        class: "relative w-full justify-center",
        disabled: !dock.canSave,
        size: "sm",
        type: "button",
        variant: "outline",
        onPress: options.onSave,
      })
        .attr("aria-keyshortcuts", commandShortcutKeys("save"))
        .children("Save", CommandShortcutHint(h, { key: "annotate-save-hint", command: "save" })),
      Button(h, {
        class: "relative w-full justify-center",
        disabled: !dock.canGoToPreviousSite,
        size: "sm",
        type: "button",
        variant: "outline",
        onPress: options.onBack,
      })
        .attr("aria-keyshortcuts", commandShortcutKeys("back"))
        .attr("data-rail-nav", "")
        .children("Back", CommandShortcutHint(h, { key: "annotate-back-hint", command: "back" })),
      Button(h, {
        class: "relative w-full justify-center",
        disabled: !dock.canGoToNextSite,
        size: "sm",
        type: "button",
        variant: "outline",
        onPress: options.onNext,
      })
        .attr("aria-keyshortcuts", commandShortcutKeys("next"))
        .attr("data-rail-nav", "")
        .children("Next", CommandShortcutHint(h, { key: "annotate-next-hint", command: "next" })),
      Button(h, {
        class: "relative w-full justify-center",
        disabled: disableContinue,
        size: "sm",
        type: "button",
        onPress: options.onAnalyze,
      })
        .attr("aria-keyshortcuts", commandShortcutKeys("analyze"))
        .children(
          "Analyze",
          CommandShortcutHint(h, { key: "annotate-analyze-hint", command: "analyze" }),
        ),
    ),
  });

  return [
    ...StudioAnnotateNav(h, {
      nav,
      standard: !expertMode,
      onSelectionChange: options.onSelectionChange,
      onContrastChange: options.onContrastChange,
      onContrastLockedChange: options.onContrastLockedChange,
    }),
    ...(Array.isArray(controlSections) ? controlSections : [controlSections]),
    actionSection,
  ];
}
