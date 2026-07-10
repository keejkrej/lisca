import type { AlignGridCellCoord, AlignGridState, AlignerSource, ContrastWindow } from "@lisca/contracts";
import type { AlignGridToolMode } from "@lisca/utils";

import type { AlignState } from "./use-align-state";
import { useAlignPage } from "./align-page-context";

export function useAlignCanvas() {
  const { state, meta } = useAlignPage();
  return {
    get frame() {
      return state().frame;
    },
    get grid() {
      return state().grid;
    },
    get toolMode() {
      return state().toolMode;
    },
    get patternZoomLocked() {
      return state().patternZoomLocked;
    },
    get manualExclusionEnabled() {
      return state().manualExclusionEnabled;
    },
    get displayedExcludedCells() {
      return state().displayedExcludedCells;
    },
    get currentExcludedCells() {
      return state().currentExcludedCells;
    },
    get visibleCounts() {
      return state().visibleCounts;
    },
    get contrast() {
      return state().contrast;
    },
    get frameLoading() {
      return meta.frameLoading;
    },
    get scanLoading() {
      return meta.scanLoading;
    },
    get error() {
      return state().error;
    },
    get status() {
      return state().status;
    },
    get workspacePath() {
      return state().workspacePath;
    },
    get source() {
      return state().source;
    },
    setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) =>
      state().setGrid(next),
    setToolMode: (mode: AlignGridToolMode) => state().setToolMode(mode),
    setPatternZoomLocked: (locked: boolean) => state().setPatternZoomLocked(locked),
    setManualExclusionEnabled: (enabled: boolean) => state().setManualExclusionEnabled(enabled),
    setContrast: (contrast: ContrastWindow | null) => state().setContrast(contrast),
    setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) =>
      state().setExcludedCellsForCurrentPosition(cells),
  };
}

export function useAlignCrop() {
  const { state } = useAlignPage();
  return {
    get cropConfirm() {
      return state().cropConfirm;
    },
    get cropProgress() {
      return state().cropProgress;
    },
    get cropping() {
      return state().cropping;
    },
    confirmCropOverwrite: () => state().confirmCropOverwrite(),
    skipExistingCrop: () => state().skipExistingCrop(),
    cancelCropConfirm: () => state().cancelCropConfirm(),
    cancelCrop: () => state().cancelCrop(),
  };
}

export function useAlignNav() {
  const { state } = useAlignPage();
  return {
    get selection() {
      return state().selection;
    },
    get scan() {
      return state().scan;
    },
    setSelection: (patch: Partial<AlignState["selection"]>) => state().setSelection(patch),
    saveCurrent: () => state().saveCurrent(),
    cropCurrent: () => state().cropCurrent(),
    cropBatch: () => state().cropBatch(),
    get saving() {
      return state().saving;
    },
    get workspacePath() {
      return state().workspacePath;
    },
    get source() {
      return state().source;
    },
    get frame() {
      return state().frame;
    },
  };
}

export function useAlignSource() {
  const { state, actions } = useAlignPage();
  return {
    get workspacePath() {
      return state().workspacePath;
    },
    get source() {
      return state().source;
    },
    get scan() {
      return state().scan;
    },
    setSource: actions.setSource,
    setSelection: actions.setSelection,
    setContrast: actions.setContrast,
  };
}