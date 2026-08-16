import { useAnnotatePage } from "./annotate-page-context";

function bindLive<Args extends unknown[], Result>(
  callback: () => (...args: Args) => Result,
): (...args: Args) => Result {
  return (...args) => callback()(...args);
}

export function useAnnotateNav() {
  const { state } = useAnnotatePage();
  return {
    get scan() {
      return state.scan;
    },
    get position() {
      return state.position;
    },
    get selection() {
      return state.selection;
    },
    get frame() {
      return state.frame;
    },
    get contrast() {
      return state.contrast;
    },
    changeSelection: bindLive(() => state.changeSelection),
    setSelection: bindLive(() => state.setSelection),
    setContrast: bindLive(() => state.setContrast),
  };
}

export function useAnnotateCanvas() {
  const { state } = useAnnotatePage();
  return {
    get frame() {
      return state.frame;
    },
    get labels() {
      return state.labels;
    },
    get tool() {
      return state.tool;
    },
    get activeLabelId() {
      return state.activeLabelId;
    },
    get brushSize() {
      return state.brushSize;
    },
    get overlayOpacity() {
      return state.overlayOpacity;
    },
    get annotation() {
      return state.annotation;
    },
    get canEditSegmentation() {
      return state.canEditSegmentation;
    },
    get canvasToasts() {
      return state.canvasToasts;
    },
  };
}

export function useAnnotateDock() {
  const { state } = useAnnotatePage();

  return {
    get mode() {
      return state.mode;
    },
    get tool() {
      return state.tool;
    },
    get request() {
      return state.request;
    },
    get canSave() {
      return state.canSave;
    },
    get saving() {
      return state.saving;
    },
    get shortcutsEnabled() {
      return (
        state.mode === "segmentation" &&
        state.canEditSegmentation &&
        !state.labelDialogOpen &&
        !state.filePickerOpen
      );
    },
    setTool: bindLive(() => state.setTool),
    handleSave: bindLive(() => state.handleSave),
  };
}

export function useAnnotateLabels() {
  const { state } = useAnnotatePage();
  return {
    get labels() {
      return state.labels;
    },
    get mode() {
      return state.mode;
    },
    get overlayOpacity() {
      return state.overlayOpacity;
    },
    get brushSize() {
      return state.brushSize;
    },
    get activeLabelId() {
      return state.activeLabelId;
    },
    get annotation() {
      return state.annotation;
    },
    get canEdit() {
      return state.canEdit;
    },
    get scanLoading() {
      return state.scanLoading;
    },
    get frameLoading() {
      return state.frameLoading;
    },
    get annotationLoading() {
      return state.annotationLoading;
    },
    get scanError() {
      return state.scanError;
    },
    get frameError() {
      return state.frameError;
    },
    get annotationError() {
      return state.annotationError;
    },
    get saveError() {
      return state.saveError;
    },
    get workspacePath() {
      return state.workspacePath;
    },
    get frame() {
      return state.frame;
    },
    setMode: bindLive(() => state.setMode),
    setOverlayOpacity: bindLive(() => state.setOverlayOpacity),
    setBrushSize: bindLive(() => state.setBrushSize),
    setActiveLabelId: bindLive(() => state.setActiveLabelId),
    openLabelDialog: () => {
      state.setLabelError(null);
      state.setLabelDialogOpen(true);
    },
  };
}

export function useAnnotateShell() {
  const { state } = useAnnotatePage();
  return {
    get workspacePath() {
      return state.workspacePath;
    },
    get filePickerOpen() {
      return state.filePickerOpen;
    },
    get labelDialogOpen() {
      return state.labelDialogOpen;
    },
    get labels() {
      return state.labels;
    },
    get labelError() {
      return state.labelError;
    },
    get saveLabelsPending() {
      return state.saveLabelsPending;
    },
    setFilePickerOpen: bindLive(() => state.setFilePickerOpen),
    setLabelDialogOpen: bindLive(() => state.setLabelDialogOpen),
    pickWorkspace: bindLive(() => state.pickWorkspace),
    handleSaveLabels: bindLive(() => state.handleSaveLabels),
    openLabelDialog: () => {
      state.setLabelError(null);
      state.setLabelDialogOpen(true);
    },
  };
}
