import type {
  AlignGridPatternCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
} from "@lisca/contracts";
import type { AlignGridPointerIntent, AlignGridToolMode } from "@lisca/utils";

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
    get effectiveGrid() {
      return state().effectiveGrid;
    },
    get drift() {
      return state().drift;
    },
    get assayDefaultTime() {
      return state().assayDefaultTime;
    },
    get selection() {
      return state().selection;
    },
    get scan() {
      return state().scan;
    },
    get toolMode() {
      return state().toolMode;
    },
    get spacingZoomLocked() {
      return state().spacingZoomLocked;
    },
    get patternZoomLocked() {
      return state().patternZoomLocked;
    },
    get manualExclusionEnabled() {
      return state().manualExclusionEnabled;
    },
    get displayedExcludedPatterns() {
      return state().displayedExcludedPatterns;
    },
    get currentExcludedPatterns() {
      return state().currentExcludedPatterns;
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
    adjustTranslation: (dx: number, dy: number) => state().adjustTranslation(dx, dy),
    commitCanvas: (
      preview: AlignGridState,
      intent: AlignGridPointerIntent,
      startGrid: AlignGridState,
    ) => state().commitCanvas(preview, intent, startGrid),
    setKeyframe: () => state().setKeyframe(),
    clearKeyframe: () => state().clearKeyframe(),
    clearDrift: () => state().clearDrift(),
    setReference: () => state().setReference(),
    setToolMode: (mode: AlignGridToolMode) => state().setToolMode(mode),
    setSpacingZoomLocked: (locked: boolean) => state().setSpacingZoomLocked(locked),
    setPatternZoomLocked: (locked: boolean) => state().setPatternZoomLocked(locked),
    setManualExclusionEnabled: (enabled: boolean) => state().setManualExclusionEnabled(enabled),
    setContrast: (contrast: ContrastWindow | null) => state().setContrast(contrast),
    setExcludedPatternsForCurrentPosition: (patterns: Iterable<AlignGridPatternCoord>) =>
      state().setExcludedPatternsForCurrentPosition(patterns),
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
