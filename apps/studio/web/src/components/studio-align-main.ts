import type { Html } from "@effect/ui/html";
import { AlignCanvas, CanvasToastStack, type CanvasToastStackOptions } from "@lisca/instrument";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { formatSelectedAxisValueLabel } from "@lisca/utils";

import type { StudioAlignPointerHandlers } from "../state/studio-align-page-context";
import {
  selectStudioAlignCanvas,
  selectStudioAlignCrop,
  selectStudioAlignNav,
} from "../state/studio-align-page-selectors";
import type { AlignPositionSaveState, StudioAlignState } from "../state/use-studio-align-state";
import { StudioAlignUnsavedChangesModal } from "./studio-align-unsaved-changes-modal";
import { StudioCropConfirmModal } from "./studio-crop-confirm-modal";
import { StudioCropStartModal } from "./studio-crop-start-modal";
import {
  alignStagePlaceholder,
  StudioStagePlaceholderView,
  studioStagePlaceholderRoute,
} from "./studio-stage-placeholder";

type CanvasStatusMessage = NonNullable<CanvasToastStackOptions["messages"]>[number];

const SAVE_STATE_LABEL: Record<AlignPositionSaveState, string> = {
  saved: "Saved",
  unsaved: "Not saved",
  changed: "Unsaved changes",
};

export type StudioAlignMainOptions<M> = {
  readonly state: StudioAlignState;
  readonly pointer: StudioAlignPointerHandlers;
  readonly visibleStatus: string | null;
  readonly onNavigate: (to: string) => M;
  readonly onResolveUnsavedChanges: (choice: "save" | "discard" | "cancel") => M;
  readonly onCancelCropStart: M;
  readonly onStartConfirmedCrop: M;
  readonly onGoToUnaligned: M;
  readonly onCancelCropConfirm: M;
  readonly onSkipExistingCrop: M;
  readonly onConfirmCropOverwrite: M;
};

export function StudioAlignMain<M>(h: Html.H<M>, options: StudioAlignMainOptions<M>) {
  const { state, pointer } = options;
  const canvas = selectStudioAlignCanvas(state);
  const nav = selectStudioAlignNav(state);
  const crop = selectStudioAlignCrop(state);

  const activeToastStatus = canvas.frameLoading
    ? "Loading frame"
    : canvas.scanLoading
      ? "Scanning source"
      : options.visibleStatus;

  const toasts: CanvasStatusMessage[] = canvas.error
    ? [{ text: canvas.error, tone: "error" }]
    : activeToastStatus
      ? [{ text: activeToastStatus }]
      : [];

  const placeholder = alignStagePlaceholder({
    workspacePath: state.workspacePath,
    hasSource: state.source != null,
    scanLoading: state.scanLoading,
    hasScan: state.scan != null,
    alignPositionCount: state.alignPositions.length,
    error: state.error,
  });

  const formattedLabel = formatSelectedAxisValueLabel(
    nav.alignPositions,
    nav.selection.pos,
    nav.scan?.positionLabels,
  );
  const positionLabel = formattedLabel || String(nav.selection.pos).padStart(2, "0");

  const stage = placeholder
    ? StudioStagePlaceholderView(h, {
        title: placeholder.title,
        description: placeholder.description,
        actionLabel: placeholder.actionLabel,
        ...(placeholder.action !== undefined
          ? { onAction: options.onNavigate(studioStagePlaceholderRoute(placeholder.action)) }
          : {}),
      })
    : ViewportCard(h, {
        children: StageCanvas(h, {
          notice: CanvasToastStack(h, { messages: toasts }),
          captionLeft: `Position ${positionLabel} · ${SAVE_STATE_LABEL[state.positionSaveState]}`,
          captionRight: canvas.frame
            ? `${canvas.frame.width} × ${canvas.frame.height} px`
            : "No frame",
          children: AlignCanvas(h, {
            class: "h-full w-full",
            cursor: pointer.cursor(),
            excludedPatterns: canvas.displayedExcludedPatterns,
            frame: canvas.frame,
            grid: canvas.grid,
            toolMode: canvas.toolMode,
            previewGridRef: pointer.previewGridRef,
            previewRedrawRef: pointer.previewRedrawRef,
            onVirtualPointerCancel: pointer.handlePointerCancel,
            onVirtualPointerDown: pointer.handlePointerDown,
            onVirtualPointerMove: pointer.handlePointerMove,
            onVirtualPointerUp: pointer.handlePointerEnd,
          }),
        }),
      });

  return [
    stage,
    StudioAlignUnsavedChangesModal(h, {
      open: state.unsavedChangesPrompt,
      pos: state.selection.pos,
      error: state.error,
      saving: state.saving,
      onResolve: options.onResolveUnsavedChanges,
    }),
    StudioCropStartModal(h, {
      confirm: crop.cropStartConfirm,
      scan: state.scan,
      onCancel: options.onCancelCropStart,
      onStart: options.onStartConfirmedCrop,
      onGoToUnaligned: options.onGoToUnaligned,
    }),
    StudioCropConfirmModal(h, {
      confirm: crop.cropConfirm,
      onCancel: options.onCancelCropConfirm,
      onSkipExisting: options.onSkipExistingCrop,
      onOverwrite: options.onConfirmCropOverwrite,
    }),
  ];
}
