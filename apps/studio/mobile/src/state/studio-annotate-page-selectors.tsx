import { useStudioAnnotatePage } from "./studio-annotate-page-context";

export function useStudioAnnotateNav() {
  const { state } = useStudioAnnotatePage();
  return {
    scan: state.scan,
    position: state.position,
    selection: state.selection,
    frame: state.frame,
    contrast: state.contrast,
    workspaceMissing: state.workspaceMissing,
    changeSelection: state.changeSelection,
    setSelection: state.setSelection,
    setContrast: state.setContrast,
  };
}

export function useStudioAnnotateCanvas() {
  const { state } = useStudioAnnotatePage();
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

export function useStudioAnnotateDock() {
  const { state } = useStudioAnnotatePage();
  const shortcutsEnabled =
    state.mode === "segmentation" && state.canEditSegmentation && !state.labelDialogOpen;
  const analysisBusy = Boolean(
    state.analysisProgress &&
    (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );

  return {
    mode: state.mode,
    tool: state.tool,
    request: state.request,
    canSave: state.canSave,
    saving: state.saving,
    shortcutsEnabled,
    scanLoading: state.scanLoading,
    scan: state.scan,
    frameLoading: state.frameLoading,
    workspaceMissing: state.workspaceMissing,
    analysisBusy,
    setTool: state.setTool,
    handleSave: state.handleSave,
    shuffleSelection: state.shuffleSelection,
    requestContinueToAnalysis: state.requestContinueToAnalysis,
  };
}

export function useStudioAnnotateLabels() {
  const { state } = useStudioAnnotatePage();
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

export function useStudioAnnotateShell() {
  const { state } = useStudioAnnotatePage();
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
