import { useAnnotatePage } from "./annotate-page-context";

export function useAnnotateNav() {
  const { state } = useAnnotatePage();
  return {
    scan: state.scan,
    position: state.position,
    selection: state.selection,
    frame: state.frame,
    contrast: state.contrast,
    changeSelection: state.changeSelection,
    setSelection: state.setSelection,
    setContrast: state.setContrast,
  };
}

export function useAnnotateCanvas() {
  const { state } = useAnnotatePage();
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

export function useAnnotateDock() {
  const { state } = useAnnotatePage();
  const shortcutsEnabled =
    state.mode === "segmentation" &&
    state.canEditSegmentation &&
    !state.labelDialogOpen &&
    !state.filePickerOpen;

  return {
    mode: state.mode,
    tool: state.tool,
    request: state.request,
    canSave: state.canSave,
    saving: state.saving,
    shortcutsEnabled,
    setTool: state.setTool,
    handleSave: state.handleSave,
  };
}

export function useAnnotateLabels() {
  const { state } = useAnnotatePage();
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

export function useAnnotateShell() {
  const { state } = useAnnotatePage();
  return {
    workspacePath: state.workspacePath,
    filePickerOpen: state.filePickerOpen,
    labelDialogOpen: state.labelDialogOpen,
    labels: state.labels,
    labelError: state.labelError,
    saveLabelsPending: state.saveLabelsPending,
    setFilePickerOpen: state.setFilePickerOpen,
    setLabelDialogOpen: state.setLabelDialogOpen,
    pickWorkspace: state.pickWorkspace,
    handleSaveLabels: state.handleSaveLabels,
    openLabelDialog: () => {
      state.setLabelError(null);
      state.setLabelDialogOpen(true);
    },
  };
}
