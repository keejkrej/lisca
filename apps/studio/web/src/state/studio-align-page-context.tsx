import { SmartExcludeModelDialog } from "@lisca/ui/features";
import { useSmartExclude } from "@lisca/smart/exclude/browser";
import { createContext, useContext, type JSX } from "solid-js";

import { useStudioAlignState, type StudioAlignState } from "./use-studio-align-state";

type StudioSmartExclude = ReturnType<typeof useSmartExclude>;

type StudioAlignPageContextValue = {
  state: StudioAlignState;
  smartExclude: StudioSmartExclude;
  saveAndAdvance: () => Promise<boolean>;
};

const StudioAlignPageContext = createContext<StudioAlignPageContextValue | null>(null);

export function StudioAlignPageProvider(props: { children?: JSX.Element }) {
  const state = useStudioAlignState();
  const smartExclude = useSmartExclude({
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
      <SmartExcludeModelDialog
        busy={smartExclude.busy()}
        state={smartExclude.downloadState()}
        onCancel={smartExclude.cancelDownload}
        onConfirm={() => void smartExclude.confirmDownload()}
      />
      {props.children}
    </StudioAlignPageContext.Provider>
  );
}

export function useStudioAlignPage(): StudioAlignPageContextValue {
  const value = useContext(StudioAlignPageContext);
  if (!value) {
    throw new Error("useStudioAlignPage must be used within StudioAlignPageProvider");
  }
  return value;
}