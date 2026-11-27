import type { AlignGridPatternCoord } from "@lisca/contracts";

import type { StudioAlignState } from "./use-studio-align-state";

export function selectStudioAlignCanvas(state: StudioAlignState) {
  return {
    frame: state.frame,
    grid: state.effectiveGrid,
    toolMode: state.toolMode,
    spacingZoomLocked: state.spacingZoomLocked,
    patternZoomLocked: state.patternZoomLocked,
    manualExclusionEnabled: state.manualExclusionEnabled,
    currentExcludedPatterns: state.currentExcludedPatterns,
    displayedExcludedPatterns: state.displayedExcludedPatterns,
    workspacePath: state.workspacePath,
    frameLoading: state.frameLoading,
    scanLoading: state.scanLoading,
    error: state.error,
    status: state.status,
    commitCanvas: state.commitCanvas,
    setToolMode: state.setToolMode,
    setSpacingZoomLocked: state.setSpacingZoomLocked,
    setPatternZoomLocked: state.setPatternZoomLocked,
    setManualExclusionEnabled: state.setManualExclusionEnabled,
    setExcludedPatternsForCurrentPosition: (patterns: Iterable<AlignGridPatternCoord>) =>
      state.setExcludedPatternsForCurrentPosition(patterns),
  };
}

export type StudioAlignCanvasSnapshot = ReturnType<typeof selectStudioAlignCanvas>;

export function selectStudioAlignCrop(state: StudioAlignState) {
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

export type StudioAlignCropSnapshot = ReturnType<typeof selectStudioAlignCrop>;

export function selectStudioAlignNav(state: StudioAlignState) {
  return {
    scan: state.scan,
    frame: state.frame,
    selection: state.selection,
    contrast: state.contrast,
    contrastLocked: state.contrastLocked,
    alignPositions: state.alignPositions,
    canGoBack: state.canGoBack,
    saving: state.saving,
    setSelection: state.setSelection,
    changePosition: state.changePosition,
    setContrast: state.setContrast,
    setContrastLocked: state.setContrastLocked,
    goBack: state.goBack,
    resetCurrent: state.resetCurrent,
  };
}

export type StudioAlignNavSnapshot = ReturnType<typeof selectStudioAlignNav>;
