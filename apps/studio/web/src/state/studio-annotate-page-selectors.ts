import type { StudioAnnotateState } from "./use-studio-annotate-state";

export function selectStudioAnnotateNav(state: StudioAnnotateState) {
  return {
    scan: state.scan,
    position: state.position,
    selection: state.selection,
    frame: state.frame,
    contrast: state.contrast,
    contrastLocked: state.contrastLocked,
    workspaceMissing: state.workspaceMissing,
    changeSelection: state.changeSelection,
    setSelection: state.setSelection,
    setContrast: state.setContrast,
    setContrastLocked: state.setContrastLocked,
  };
}

export type StudioAnnotateNavSnapshot = ReturnType<typeof selectStudioAnnotateNav>;

export function selectStudioAnnotateCanvas(state: StudioAnnotateState) {
  return {
    frame: state.frame,
    labels: state.labels,
    tool: state.tool,
    activeLabelId: state.activeLabelId,
    brushSize: state.brushSize,
    overlayOpacity: state.overlayOpacity,
    annotation: state.annotation,
    canEditSegmentation: state.canEditSegmentation,
    canvasToasts: state.canvasToasts,
  };
}

export type StudioAnnotateCanvasSnapshot = ReturnType<typeof selectStudioAnnotateCanvas>;

export function selectStudioAnnotateDock(state: StudioAnnotateState) {
  return {
    mode: state.mode,
    tool: state.tool,
    request: state.request,
    canSave: state.canSave,
    saving: state.saving,
    shortcutsEnabled:
      state.mode === "segmentation" && state.canEditSegmentation && !state.labelDialogOpen,
    scanLoading: state.scanLoading,
    scan: state.scan,
    frameLoading: state.frameLoading,
    workspaceMissing: state.workspaceMissing,
    analysisBusy: Boolean(
      state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
    ),
    setTool: state.setTool,
    handleSave: state.handleSave,
    canGoToNextSite: state.canGoToNextSite,
    goToNextSite: state.goToNextSite,
    canGoToPreviousSite: state.canGoToPreviousSite,
    goToPreviousSite: state.goToPreviousSite,
    requestContinueToAnalysis: state.requestContinueToAnalysis,
  };
}

export type StudioAnnotateDockSnapshot = ReturnType<typeof selectStudioAnnotateDock>;

export function selectStudioAnnotateLabels(state: StudioAnnotateState) {
  return {
    labels: state.labels,
    mode: state.mode,
    overlayOpacity: state.overlayOpacity,
    brushSize: state.brushSize,
    activeLabelId: state.activeLabelId,
    annotation: state.annotation,
    canEdit: state.canEdit,
    scanLoading: state.scanLoading,
    frameLoading: state.frameLoading,
    annotationLoading: state.annotationLoading,
    scanError: state.scanError,
    frameError: state.frameError,
    annotationError: state.annotationError,
    saveError: state.saveError,
    workspacePath: state.workspacePath,
    frame: state.frame,
    setMode: state.setMode,
    setOverlayOpacity: state.setOverlayOpacity,
    setBrushSize: state.setBrushSize,
    setActiveLabelId: state.setActiveLabelId,
    openLabelDialog: () => {
      state.setLabelError(null);
      state.setLabelDialogOpen(true);
    },
  };
}

export type StudioAnnotateLabelsSnapshot = ReturnType<typeof selectStudioAnnotateLabels>;

export function selectStudioAnnotateShell(state: StudioAnnotateState) {
  return {
    workspacePath: state.workspacePath,
    labelDialogOpen: state.labelDialogOpen,
    labels: state.labels,
    labelError: state.labelError,
    saveLabelsPending: state.saveLabelsPending,
    setLabelDialogOpen: state.setLabelDialogOpen,
    handleSaveLabels: state.handleSaveLabels,
  };
}

export type StudioAnnotateShellSnapshot = ReturnType<typeof selectStudioAnnotateShell>;
