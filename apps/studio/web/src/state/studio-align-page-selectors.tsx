import type { AlignGridCellCoord } from "@lisca/contracts";

import { useStudioAlignPage } from "./studio-align-page-context";

export function useStudioAlignCanvas() {
  const { state } = useStudioAlignPage();
  return {
    get frame() {
      return state.frame;
    },
    get grid() {
      return state.grid;
    },
    get toolMode() {
      return state.toolMode;
    },
    get patternZoomLocked() {
      return state.patternZoomLocked;
    },
    get manualExclusionEnabled() {
      return state.manualExclusionEnabled;
    },
    get currentExcludedCells() {
      return state.currentExcludedCells;
    },
    get displayedExcludedCells() {
      return state.displayedExcludedCells;
    },
    get workspacePath() {
      return state.workspacePath;
    },
    get frameLoading() {
      return state.frameLoading;
    },
    get scanLoading() {
      return state.scanLoading;
    },
    get error() {
      return state.error;
    },
    get status() {
      return state.status;
    },
    setGrid: state.setGrid,
    setToolMode: state.setToolMode,
    setPatternZoomLocked: state.setPatternZoomLocked,
    setManualExclusionEnabled: state.setManualExclusionEnabled,
    setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) =>
      state.setExcludedCellsForCurrentPosition(cells),
  };
}
export function useStudioAlignCrop() {
  const { state } = useStudioAlignPage();
  return {
    get cropStartConfirm() {
      return state.cropStartConfirm;
    },
    get cropConfirm() {
      return state.cropConfirm;
    },
    get cropProgress() {
      return state.cropProgress;
    },
    get cropping() {
      return state.cropping;
    },
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
    get selection() {
      return state.selection;
    },
    get alignPositions() {
      return state.alignPositions;
    },
    get canGoBack() {
      return state.canGoBack;
    },
    goBack: state.goBack,
    resetCurrent: state.resetCurrent,
    goToFirstUnaligned: state.goToFirstUnaligned,
    get saving() {
      return state.saving;
    },
  };
}
