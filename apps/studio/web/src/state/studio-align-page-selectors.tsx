import { useMemo } from "react";

import { useStudioAlignPage } from "./studio-align-page-context";

export function useStudioAlignCanvas() {
  const { state } = useStudioAlignPage();
  return useMemo(
    () => ({
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
      setGrid: state.setGrid,
      setToolMode: state.setToolMode,
      setPatternZoomLocked: state.setPatternZoomLocked,
    }),
    [state],
  );
}

export function useStudioAlignCrop() {
  const { state } = useStudioAlignPage();
  return useMemo(
    () => ({
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
    }),
    [state],
  );
}

export function useStudioAlignNav() {
  const { state } = useStudioAlignPage();
  return useMemo(
    () => ({
      selection: state.selection,
      alignPositions: state.alignPositions,
      canGoBack: state.canGoBack,
      goBack: state.goBack,
      resetCurrent: state.resetCurrent,
      goToFirstUnaligned: state.goToFirstUnaligned,
      saveAndAdvance: state.saveAndAdvance,
      saving: state.saving,
    }),
    [state],
  );
}
