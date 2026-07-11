import { useSmartExclude } from "@lisca/smart/exclude/request";
import { useVarExclude } from "@lisca/smart/var-exclude";
import type { JSX } from "solid-js";

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
      return Boolean(state.frame) && !state.cropping && !state.saving;
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
      return Boolean(state.frame) && !state.cropping && !state.saving;
    },
    onPreview: state.showVariationExcludePreview,
    onStatus: state.reportStatus,
    onError: state.reportError,
  });

  const saveAndAdvance = async (): Promise<boolean> => {
    try {
      const excludedCells = await varExclude.autoExclude();
      return await state.saveAndAdvanceWithExcludedCells(excludedCells);
    } catch (cause) {
      state.reportError(cause instanceof Error ? cause.message : "Var exclude failed");
      return false;
    }
  };

  return (
    <StudioAlignPageContext.Provider value={{ state, smartExclude, varExclude, saveAndAdvance }}>
      {props.children}
    </StudioAlignPageContext.Provider>
  );
}