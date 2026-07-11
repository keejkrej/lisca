import { useSmartExclude } from "@lisca/smart/exclude/request";
import type { JSX } from "solid-js";

import { useStudioAlignState } from "./use-studio-align-state";
import { StudioAlignPageContext } from "./studio-align-page-context";
import { createStudioSmartExcludeProvider } from "./studio-smart-exclude";

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

  const saveAndAdvance = async (): Promise<boolean> => {
    try {
      const modelCells = await smartExclude.ensureAndClassify();
      return await state.saveAndAdvanceWithModelCells(modelCells);
    } catch (cause) {
      if (cause instanceof Error && cause.message === "Smart exclude cancelled") {
        state.reportError(null);
        return false;
      }
      state.reportError(cause instanceof Error ? cause.message : "Smart exclude failed");
      return false;
    }
  };

  return (
    <StudioAlignPageContext.Provider value={{ state, smartExclude, saveAndAdvance }}>
      {props.children}
    </StudioAlignPageContext.Provider>
  );
}