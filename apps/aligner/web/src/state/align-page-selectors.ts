import type { AlignState } from "./use-align-state";

export function selectAlignCanvas(state: AlignState) {
  return {
    frame: state.frame,
    grid: state.grid,
    effectiveGrid: state.effectiveGrid,
    drift: state.drift,
    assayDefaultTime: state.assayDefaultTime,
    selection: state.selection,
    scan: state.scan,
    toolMode: state.toolMode,
    spacingZoomLocked: state.spacingZoomLocked,
    patternZoomLocked: state.patternZoomLocked,
    manualExclusionEnabled: state.manualExclusionEnabled,
    displayedExcludedPatterns: state.displayedExcludedPatterns,
    currentExcludedPatterns: state.currentExcludedPatterns,
    visibleCounts: state.visibleCounts,
    contrast: state.contrast,
    contrastLocked: state.contrastLocked,
    frameLoading: state.frameLoading,
    scanLoading: state.scanLoading,
    error: state.error,
    status: state.status,
    detecting: state.detecting,
    detectReport: state.detectReport,
    detectLowConfidence: state.detectLowConfidence,
    detectGrid: state.detectGrid,
    workspacePath: state.workspacePath,
    source: state.source,
    setGrid: state.setGrid,
    adjustTranslation: state.adjustTranslation,
    setDriftDelta: state.setDriftDelta,
    commitCanvas: state.commitCanvas,
    setKeyframe: state.setKeyframe,
    clearKeyframe: state.clearKeyframe,
    clearDrift: state.clearDrift,
    setReference: state.setReference,
    setToolMode: state.setToolMode,
    setSpacingZoomLocked: state.setSpacingZoomLocked,
    setPatternZoomLocked: state.setPatternZoomLocked,
    setManualExclusionEnabled: state.setManualExclusionEnabled,
    setContrast: state.setContrast,
    setContrastLocked: state.setContrastLocked,
    setExcludedPatternsForCurrentPosition: state.setExcludedPatternsForCurrentPosition,
  };
}

export function selectAlignNav(state: AlignState) {
  return {
    selection: state.selection,
    scan: state.scan,
    positionSaveState: state.positionSaveState,
    canGoBack: state.canGoBack,
    canGoNext: state.canGoNext,
    changePosition: state.changePosition,
    goBack: state.goBack,
    goNext: state.goNext,
    setSelection: state.setSelection,
    saveCurrent: state.saveCurrent,
    cropCurrent: state.cropCurrent,
    cropBatch: state.cropBatch,
    saving: state.saving,
    workspacePath: state.workspacePath,
    source: state.source,
    frame: state.frame,
  };
}

export function selectAlignSource(state: AlignState) {
  return {
    workspacePath: state.workspacePath,
    source: state.source,
    scan: state.scan,
    setSource: state.setSource,
    setSelection: state.setSelection,
    setContrast: state.setContrast,
    refreshAgentWorkspace: state.refreshAgentWorkspace,
  };
}
