import { useStudioAlignPage } from "./studio-align-page-context";

export function useStudioAlignCanvas() {
  const { state } = useStudioAlignPage();
  return {
    frame: state.frame,
    grid: state.grid,
    toolMode: state.toolMode,
    patternZoomLocked: state.patternZoomLocked,
    displayedExcludedCells: state.displayedExcludedCells,
    workspacePath: state.workspacePath,
    frameLoading: state.frameLoading,
    scanLoading: state.scanLoading,
    error: state.error,
    status: state.status,
    cropping: state.cropping,
    saving: state.saving,
    selection: state.selection,
    alignPositions: state.alignPositions,
    setGrid: state.setGrid,
    setToolMode: state.setToolMode,
    setPatternZoomLocked: state.setPatternZoomLocked,
  };
}

export function useStudioAlignCrop() {
  const { state } = useStudioAlignPage();
  return {
    cropStartConfirm: state.cropStartConfirm,
    cropConfirm: state.cropConfirm,
    cropProgress: state.cropProgress,
    cropping: state.cropping,
    startConfirmedCrop: state.startConfirmedCrop,
    cancelCropStartConfirm: state.cancelCropStartConfirm,
    confirmCropOverwrite: state.confirmCropOverwrite,
    skipExistingCrop: state.skipExistingCrop,
    cancelCropConfirm: state.cancelCropConfirm,
    cancelCrop: state.cancelCrop,
  };
}

export function useStudioAlignNav() {
  const { state } = useStudioAlignPage();
  return {
    selection: state.selection,
    alignPositions: state.alignPositions,
    canGoBack: state.canGoBack,
    goBack: state.goBack,
    resetCurrent: state.resetCurrent,
    goToFirstUnaligned: state.goToFirstUnaligned,
    saveAndAdvanceWithModelCells: state.saveAndAdvanceWithModelCells,
    saving: state.saving,
    cropping: state.cropping,
    frame: state.frame,
    workspacePath: state.workspacePath,
    findingFirstUnaligned: state.findingFirstUnaligned,
  };
}
