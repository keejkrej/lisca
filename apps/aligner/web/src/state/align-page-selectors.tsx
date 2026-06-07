import { useMemo } from "react";

import { useAlignPage } from "./align-page-context";

export function useAlignCanvas() {
  const { state, meta } = useAlignPage();
  return useMemo(
    () => ({
      frame: state.frame,
      grid: state.grid,
      toolMode: state.toolMode,
      patternZoomLocked: state.patternZoomLocked,
      displayedExcludedCells: state.displayedExcludedCells,
      currentExcludedCells: state.currentExcludedCells,
      visibleCounts: state.visibleCounts,
      contrast: state.contrast,
      frameLoading: meta.frameLoading,
      scanLoading: meta.scanLoading,
      error: state.error,
      status: state.status,
      workspacePath: state.workspacePath,
      source: state.source,
      setGrid: state.setGrid,
      setToolMode: state.setToolMode,
      setPatternZoomLocked: state.setPatternZoomLocked,
      setContrast: state.setContrast,
      setExcludedCellsForCurrentPosition: state.setExcludedCellsForCurrentPosition,
    }),
    [meta.frameLoading, meta.scanLoading, state],
  );
}

export function useAlignCrop() {
  const { state } = useAlignPage();
  return useMemo(
    () => ({
      cropConfirm: state.cropConfirm,
      cropProgress: state.cropProgress,
      cropping: state.cropping,
      confirmCropOverwrite: state.confirmCropOverwrite,
      skipExistingCrop: state.skipExistingCrop,
      cancelCropConfirm: state.cancelCropConfirm,
      cancelCrop: state.cancelCrop,
    }),
    [state],
  );
}

export function useAlignNav() {
  const { state } = useAlignPage();
  return useMemo(
    () => ({
      selection: state.selection,
      scan: state.scan,
      setSelection: state.setSelection,
      saveCurrent: state.saveCurrent,
      cropCurrent: state.cropCurrent,
      cropBatch: state.cropBatch,
      saving: state.saving,
      workspacePath: state.workspacePath,
      source: state.source,
      frame: state.frame,
    }),
    [state],
  );
}

export function useAlignSource() {
  const { state, actions } = useAlignPage();
  return useMemo(
    () => ({
      workspacePath: state.workspacePath,
      source: state.source,
      scan: state.scan,
      setSource: actions.setSource,
      setSelection: actions.setSelection,
      setContrast: actions.setContrast,
    }),
    [actions, state],
  );
}
