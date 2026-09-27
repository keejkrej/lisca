import { mergeAlignGridEdgeExclusion } from "@lisca/client/align-session";
import { useSmartExclude } from "@lisca/smart/exclude/request";
import { useVarExclude } from "@lisca/smart/var-exclude";
import { createMemo, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import { StudioAlignVariationExcludeDialog } from "../components/studio-align-variation-exclude-dialog";
import { useStudioAlignState } from "./use-studio-align-state";
import { StudioAlignPageContext } from "./studio-align-page-context";
import { createStudioSmartExcludeProvider } from "./studio-smart-exclude";
import { createStudioVarExcludeProvider } from "./studio-var-exclude";

export function StudioAlignPageProvider(props: { children?: JSX.Element }) {
  const state = useStudioAlignState();
  const smartExcludeProvider = createStudioSmartExcludeProvider({
    source: () => state.source,
    selection: () => state.selection,
    contrast: () => state.contrast,
  });
  const smartExclude = useSmartExclude({
    provider: smartExcludeProvider,
    frame: () => state.frame,
    grid: () => state.grid,
    currentExcludedCells: () => state.currentExcludedCells,
    enabled: () => Boolean(state.frame) && !state.saving,
    onComplete: state.applySmartExclusion,
    onError: state.reportError,
  });
  const varExclude = useVarExclude({
    provider: createStudioVarExcludeProvider(),
    frame: () => state.frame,
    grid: () => state.grid,
    currentExcludedCells: () => state.currentExcludedCells,
    enabled: () => Boolean(state.frame) && !state.saving,
    onPreview: state.showVariationExcludePreview,
    onStatus: state.reportStatus,
    onError: state.reportError,
  });

  const excludeActive = createMemo(() => varExclude.active() || smartExclude.active());

  /** Selection var exclude: additive on current exclusions, plus edge cells once applied. */
  const requestVarExclude = async (): Promise<void> => {
    await varExclude.requestPreview();
  };

  const applyExcludePreview = () => {
    const preview = state.variationExcludePreview;
    if (!preview) return;
    state.applyVariationExclude();
    const frame = state.frame;
    if (!frame) return;
    state.setExcludedCellsForCurrentPosition(
      mergeAlignGridEdgeExclusion(state.currentExcludedCells, frame, state.grid),
    );
  };

  const cancelExcludePreview = () => {
    state.cancelVariationExclude();
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
        requestVarExclude,
        applyExcludePreview,
        cancelExcludePreview,
      }}
    >
      {props.children}
      <StudioAlignVariationExcludeDialog />
    </StudioAlignPageContext.Provider>
  );
}
