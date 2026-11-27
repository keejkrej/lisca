import type { AnnotateState } from "./use-annotate-state";

function bindLive<Args extends unknown[], Result>(
  callback: () => (...args: Args) => Result,
): (...args: Args) => Result {
  return (...args) => callback()(...args);
}

export function selectAnnotateNav(getState: () => AnnotateState) {
  return {
    get scan() {
      return getState().scan;
    },
    get position() {
      return getState().position;
    },
    get selection() {
      return getState().selection;
    },
    get frame() {
      return getState().frame;
    },
    get contrast() {
      return getState().contrast;
    },
    get contrastLocked() {
      return getState().contrastLocked;
    },
    changeSelection: bindLive(() => getState().changeSelection),
    setSelection: bindLive(() => getState().setSelection),
    setContrast: bindLive(() => getState().setContrast),
    setContrastLocked: bindLive(() => getState().setContrastLocked),
  };
}

export function selectAnnotateCanvas(getState: () => AnnotateState) {
  return {
    get frame() {
      return getState().frame;
    },
    get labels() {
      return getState().labels;
    },
    get tool() {
      return getState().tool;
    },
    get activeLabelId() {
      return getState().activeLabelId;
    },
    get brushSize() {
      return getState().brushSize;
    },
    get overlayOpacity() {
      return getState().overlayOpacity;
    },
    get annotation() {
      return getState().annotation;
    },
    get canEditSegmentation() {
      return getState().canEditSegmentation;
    },
    get canvasToasts() {
      return getState().canvasToasts;
    },
  };
}

export function selectAnnotateDock(getState: () => AnnotateState) {
  return {
    get mode() {
      return getState().mode;
    },
    get tool() {
      return getState().tool;
    },
    get request() {
      return getState().request;
    },
    get canSave() {
      return getState().canSave;
    },
    get saving() {
      return getState().saving;
    },
    get canGoBack() {
      return getState().canGoBack;
    },
    get canGoNext() {
      return getState().canGoNext;
    },
    get shortcutsEnabled() {
      const state = getState();
      return (
        state.mode === "segmentation" &&
        state.canEditSegmentation &&
        !state.labelDialogOpen &&
        !state.filePickerOpen
      );
    },
    setTool: bindLive(() => getState().setTool),
    handleSave: bindLive(() => getState().handleSave),
    goBack: bindLive(() => getState().goBack),
    goNext: bindLive(() => getState().goNext),
  };
}

export function selectAnnotateLabels(getState: () => AnnotateState) {
  return {
    get labels() {
      return getState().labels;
    },
    get mode() {
      return getState().mode;
    },
    get overlayOpacity() {
      return getState().overlayOpacity;
    },
    get brushSize() {
      return getState().brushSize;
    },
    get activeLabelId() {
      return getState().activeLabelId;
    },
    get annotation() {
      return getState().annotation;
    },
    get canEdit() {
      return getState().canEdit;
    },
    get scanLoading() {
      return getState().scanLoading;
    },
    get frameLoading() {
      return getState().frameLoading;
    },
    get annotationLoading() {
      return getState().annotationLoading;
    },
    get scanError() {
      return getState().scanError;
    },
    get frameError() {
      return getState().frameError;
    },
    get annotationError() {
      return getState().annotationError;
    },
    get saveError() {
      return getState().saveError;
    },
    get workspacePath() {
      return getState().workspacePath;
    },
    get frame() {
      return getState().frame;
    },
    setMode: bindLive(() => getState().setMode),
    setOverlayOpacity: bindLive(() => getState().setOverlayOpacity),
    setBrushSize: bindLive(() => getState().setBrushSize),
    setActiveLabelId: bindLive(() => getState().setActiveLabelId),
    openLabelDialog: () => {
      const state = getState();
      state.setLabelError(null);
      state.setLabelDialogOpen(true);
    },
  };
}

export function selectAnnotateShell(getState: () => AnnotateState) {
  return {
    get workspacePath() {
      return getState().workspacePath;
    },
    get filePickerOpen() {
      return getState().filePickerOpen;
    },
    get labelDialogOpen() {
      return getState().labelDialogOpen;
    },
    get labels() {
      return getState().labels;
    },
    get labelError() {
      return getState().labelError;
    },
    get saveLabelsPending() {
      return getState().saveLabelsPending;
    },
    setFilePickerOpen: bindLive(() => getState().setFilePickerOpen),
    setLabelDialogOpen: bindLive(() => getState().setLabelDialogOpen),
    pickWorkspace: bindLive(() => getState().pickWorkspace),
    handleSaveLabels: bindLive(() => getState().handleSaveLabels),
    refreshAgentWorkspace: bindLive(() => getState().refreshAgentWorkspace),
    openLabelDialog: () => {
      const state = getState();
      state.setLabelError(null);
      state.setLabelDialogOpen(true);
    },
  };
}
