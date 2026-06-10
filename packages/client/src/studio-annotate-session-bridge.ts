import type { AnnotationLabel, ContrastWindow, FrameResult } from "@lisca/contracts";
import type {
  AnnotatorUiActions,
  AnnotatorUiState,
  RoiSelection,
  StateUpdater,
} from "./atoms/annotator-ui.ts";

export type StudioAnnotateRoiViewState = {
  workspacePath: string | null;
  selection: RoiSelection;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
  frameLoading: boolean;
  scanError: string | null;
  frameError: string | null;
  status: string | null;
};

/** Store state that includes ROI view fields plus studio-only analysis fields. */
export type StudioAnnotateStoreLike = StudioAnnotateRoiViewState & Record<string, unknown>;

export type StudioAnnotateSetUi = (update: StateUpdater<unknown>) => void;

export type StudioAnnotateSessionActions = {
  setWorkspacePath: (set: StudioAnnotateSetUi, workspacePath: string | null) => void;
  setSelection: (set: StudioAnnotateSetUi, patch: Partial<RoiSelection>) => void;
  setFrame: (set: StudioAnnotateSetUi, frame: FrameResult | null) => void;
  setScanError: (set: StudioAnnotateSetUi, scanError: string | null) => void;
  setStatus: (set: StudioAnnotateSetUi, status: string | null) => void;
};

export function studioAnnotateToAnnotatorUi(state: StudioAnnotateRoiViewState): AnnotatorUiState {
  return {
    workspacePath: state.workspacePath,
    selection: state.selection,
    activeLabelId: null,
    mode: "classification",
    tool: "brush",
    brushSize: 4,
    overlayOpacity: 0.35,
    frame: state.frame,
    contrast: state.contrast,
    contrastDomain: state.contrastDomain,
    contrastMin: state.contrastMin,
    contrastMax: state.contrastMax,
    frameLoading: state.frameLoading,
    annotationLoading: false,
    saving: false,
    scanError: state.scanError,
    frameError: state.frameError,
    annotationError: null,
    saveError: null,
    labelError: null,
    status: state.status,
    labelDialogOpen: false,
  };
}

export function applyAnnotatorUiPatch<T extends StudioAnnotateRoiViewState>(
  current: T,
  update: StateUpdater<AnnotatorUiState>,
): T {
  const annotatorCurrent = studioAnnotateToAnnotatorUi(current);
  const nextAnnotator = typeof update === "function" ? update(annotatorCurrent) : update;
  return {
    ...current,
    workspacePath: nextAnnotator.workspacePath,
    selection: nextAnnotator.selection,
    frame: nextAnnotator.frame,
    contrast: nextAnnotator.contrast,
    contrastDomain: nextAnnotator.contrastDomain,
    contrastMin: nextAnnotator.contrastMin,
    contrastMax: nextAnnotator.contrastMax,
    frameLoading: nextAnnotator.frameLoading,
    scanError: nextAnnotator.scanError,
    frameError: nextAnnotator.frameError,
    status: nextAnnotator.status,
  };
}

export function createStudioAnnotateSetUi<T extends StudioAnnotateRoiViewState>(
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
    setActiveLabelId() {},
    syncActiveLabelFromLabels() {},
    applySavedLabels() {},
    setMode() {},
    setTool() {},
    setBrushSize() {},
    setOverlayOpacity() {},
    setFrame(set, frame) {
      studioActions.setFrame(set as StudioAnnotateSetUi, frame);
    },
    setContrast() {},
    setContrastState() {},
    setFrameLoading() {},
    setAnnotationLoading() {},
    setSaving() {},
    setScanError(set, scanError) {
      studioActions.setScanError(set as StudioAnnotateSetUi, scanError);
    },
    setFrameError() {},
    setAnnotationError() {},
    setSaveError() {},
    setLabelError() {},
    setStatus(set, status) {
      studioActions.setStatus(set as StudioAnnotateSetUi, status);
    },
    setLabelDialogOpen() {},
  };
}

export type StudioAnnotateSessionBridge = {
  toAnnotatorUi: typeof studioAnnotateToAnnotatorUi;
  createSetUi: typeof createStudioAnnotateSetUi;
  createActions: typeof createStudioAnnotateSessionActions;
};
