import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import type {
  AnnotatorUiActions,
  AnnotatorUiState,
  RoiSelection,
  StateUpdater,
} from "../atoms/annotator-ui";

export type StudioAnnotateUiState = AnnotatorUiState;

export type StudioAnnotateStoreLike = StudioAnnotateUiState & Record<string, unknown>;

export type StudioAnnotateSetUi = (update: StateUpdater<unknown>) => void;

export type StudioAnnotateSessionActions = Pick<
  AnnotatorUiActions,
  | "setWorkspacePath"
  | "setSelection"
  | "setActiveLabelId"
  | "syncActiveLabelFromLabels"
  | "applySavedLabels"
  | "setMode"
  | "setTool"
  | "setBrushSize"
  | "setOverlayOpacity"
  | "setFrame"
  | "setContrast"
  | "setContrastState"
  | "setFrameLoading"
  | "setAnnotationLoading"
  | "setSaving"
  | "setScanError"
  | "setFrameError"
  | "setAnnotationError"
  | "setSaveError"
  | "setLabelError"
  | "setStatus"
  | "setLabelDialogOpen"
>;

export function studioAnnotateToAnnotatorUi(state: StudioAnnotateUiState): AnnotatorUiState {
  return state;
}

export function applyAnnotatorUiPatch<T extends StudioAnnotateUiState>(
  current: T,
  update: StateUpdater<AnnotatorUiState>,
): T {
  const nextAnnotator =
    typeof update === "function" ? update(studioAnnotateToAnnotatorUi(current)) : update;
  return {
    ...current,
    ...nextAnnotator,
  };
}

export function createStudioAnnotateSetUi<T extends StudioAnnotateUiState>(
  setUi: (update: StateUpdater<T>) => void,
): (update: StateUpdater<AnnotatorUiState>) => void {
  return (update) => {
    setUi((current) => applyAnnotatorUiPatch(current, update));
  };
}

export function createStudioAnnotateSessionActions(
  studioActions: StudioAnnotateSessionActions,
): AnnotatorUiActions {
  return {
    setWorkspacePath(set, workspacePath) {
      studioActions.setWorkspacePath(set as StudioAnnotateSetUi, workspacePath);
    },
    setSelection(set, patch) {
      studioActions.setSelection(set as StudioAnnotateSetUi, patch);
    },
    setActiveLabelId(set, activeLabelId) {
      studioActions.setActiveLabelId(set as StudioAnnotateSetUi, activeLabelId);
    },
    syncActiveLabelFromLabels(set, labelIds) {
      studioActions.syncActiveLabelFromLabels(set as StudioAnnotateSetUi, labelIds);
    },
    applySavedLabels(set, labels) {
      studioActions.applySavedLabels(set as StudioAnnotateSetUi, labels);
    },
    setMode(set, mode) {
      studioActions.setMode(set as StudioAnnotateSetUi, mode);
    },
    setTool(set, tool) {
      studioActions.setTool(set as StudioAnnotateSetUi, tool);
    },
    setBrushSize(set, brushSize) {
      studioActions.setBrushSize(set as StudioAnnotateSetUi, brushSize);
    },
    setOverlayOpacity(set, overlayOpacity) {
      studioActions.setOverlayOpacity(set as StudioAnnotateSetUi, overlayOpacity);
    },
    setFrame(set, frame) {
      studioActions.setFrame(set as StudioAnnotateSetUi, frame);
    },
    setContrast(set, contrast) {
      studioActions.setContrast(set as StudioAnnotateSetUi, contrast);
    },
    setContrastState(set, frame) {
      studioActions.setContrastState(set as StudioAnnotateSetUi, frame);
    },
    setFrameLoading(set, frameLoading) {
      studioActions.setFrameLoading(set as StudioAnnotateSetUi, frameLoading);
    },
    setAnnotationLoading(set, annotationLoading) {
      studioActions.setAnnotationLoading(set as StudioAnnotateSetUi, annotationLoading);
    },
    setSaving(set, saving) {
      studioActions.setSaving(set as StudioAnnotateSetUi, saving);
    },
    setScanError(set, scanError) {
      studioActions.setScanError(set as StudioAnnotateSetUi, scanError);
    },
    setFrameError(set, frameError) {
      studioActions.setFrameError(set as StudioAnnotateSetUi, frameError);
    },
    setAnnotationError(set, annotationError) {
      studioActions.setAnnotationError(set as StudioAnnotateSetUi, annotationError);
    },
    setSaveError(set, saveError) {
      studioActions.setSaveError(set as StudioAnnotateSetUi, saveError);
    },
    setLabelError(set, labelError) {
      studioActions.setLabelError(set as StudioAnnotateSetUi, labelError);
    },
    setStatus(set, status) {
      studioActions.setStatus(set as StudioAnnotateSetUi, status);
    },
    setLabelDialogOpen(set, labelDialogOpen) {
      studioActions.setLabelDialogOpen(set as StudioAnnotateSetUi, labelDialogOpen);
    },
  };
}

export type StudioAnnotateSessionBridge = {
  toAnnotatorUi: typeof studioAnnotateToAnnotatorUi;
  createSetUi: typeof createStudioAnnotateSetUi;
  createActions: typeof createStudioAnnotateSessionActions;
};
