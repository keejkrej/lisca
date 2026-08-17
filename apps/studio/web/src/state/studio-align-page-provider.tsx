import {
  applyDockVariationExcludeWithEdge,
  mergeAlignGridEdgeExclusion,
} from "@lisca/client/align-session";
import { useSmartExclude } from "@lisca/smart/exclude/request";
import { useVarExclude } from "@lisca/smart/var-exclude";
import { createMemo, createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import { StudioAlignVariationExcludeDialog } from "../components/studio-align-variation-exclude-dialog";
import { useStudioAlignState } from "./use-studio-align-state";
import { StudioAlignPageContext } from "./studio-align-page-context";
import { createStudioSmartExcludeProvider } from "./studio-smart-exclude";
import { createStudioVarExcludeProvider } from "./studio-var-exclude";

export function StudioAlignPageProvider(props: { children?: JSX.Element }) {
  const state = useStudioAlignState();
  const [dockExcludePreview, setDockExcludePreview] = createSignal(false);
  const smartExcludeProvider = createStudioSmartExcludeProvider({
    source: () => state.source,
    selection: () => state.selection,
    contrast: () => state.contrast,
  });
  const smartExclude = useSmartExclude({
    provider: smartExcludeProvider,
    get frame() {
      return state.frame;
    },
    get grid() {
      return state.grid;
    },
    get currentExcludedCells() {
      return state.currentExcludedCells;
    },
    get enabled() {
      return Boolean(state.frame) && !state.saving;
    },
    onComplete: state.applySmartExclusion,
    onError: state.reportError,
  });
  const varExclude = useVarExclude({
    provider: createStudioVarExcludeProvider(),
    get frame() {
      return state.frame;
    },
    get grid() {
      return state.grid;
    },
    get currentExcludedCells() {
      return state.currentExcludedCells;
    },
    get enabled() {
      return Boolean(state.frame) && !state.saving;
    },
    onPreview: state.showVariationExcludePreview,
    onStatus: state.reportStatus,
    onError: state.reportError,
  });

  const excludeActive = createMemo(() => varExclude.active() || smartExclude.active());

  /** Dock action: overwrite exclusions, then edge + var-exclude provider. */
  const runExclude = async (): Promise<void> => {
    const frame = state.frame;
    if (!frame || state.saving) return;
    setDockExcludePreview(true);
    state.setExcludedCellsForCurrentPosition(mergeAlignGridEdgeExclusion([], frame, state.grid));
    await varExclude.requestPreview();
  };

  /** Expert rail var exclude: additive on current exclusions. */
  const requestExpertVarExclude = async (): Promise<void> => {
    setDockExcludePreview(false);
    await varExclude.requestPreview();
  };

  const applyExcludePreview = () => {
    const preview = state.variationExcludePreview;
    const frame = state.frame;
    if (!preview || !frame) return;
    if (dockExcludePreview()) {
      const applied = applyDockVariationExcludeWithEdge(frame, state.grid, preview);
      state.setExcludedCellsForCurrentPosition(applied.cells);
      state.dismissVariationExcludePreview();
      state.reportStatus(
        `Var excluded ${applied.variationCells.length} of ${applied.eligibleCellCount} cells`,
      );
    } else {
      state.applyVariationExclude();
    }
    setDockExcludePreview(false);
  };

  const cancelExcludePreview = () => {
    state.cancelVariationExclude();
    setDockExcludePreview(false);
  };

  const saveAndAdvance = async (): Promise<boolean> => {
    if (state.saving) return false;
    return await state.saveAndAdvanceWithExcludedCells(state.currentExcludedCells);
  };

  onCleanup(() => {
    state.setManualExclusionEnabled(false);
    state.cancelVariationExclude();
  });

  return (
    <StudioAlignPageContext.Provider
      value={{
        state,
        smartExclude,
        varExclude,
        excludeActive,
        runExclude,
        requestExpertVarExclude,
        applyExcludePreview,
        cancelExcludePreview,
        saveAndAdvance,
      }}
    >
      {props.children}
      <StudioAlignVariationExcludeDialog />
    </StudioAlignPageContext.Provider>
  );
}
