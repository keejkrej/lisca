import { SmartExcludeModelDialog } from "@lisca/ui-native";
import { useSmartExclude } from "@lisca/smart/exclude/browser";
import { createContext, useContext, type ReactNode } from "react";

import { useStudioAlignState, type StudioAlignState } from "./use-studio-align-state";

type StudioSmartExclude = ReturnType<typeof useSmartExclude>;

type StudioAlignPageContextValue = {
  state: StudioAlignState;
  smartExclude: StudioSmartExclude;
  saveAndAdvance: () => Promise<boolean>;
};

const StudioAlignPageContext = createContext<StudioAlignPageContextValue | null>(null);

export function StudioAlignPageProvider({ children }: { children: ReactNode }) {
  const state = useStudioAlignState();
  const smartExclude = useSmartExclude({
    frame: state.frame,
    grid: state.grid,
    currentExcludedCells: state.currentExcludedCells,
    enabled: Boolean(state.frame) && !state.cropping && !state.saving,
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
        busy={smartExclude.busy}
        state={smartExclude.downloadState}
        onCancel={smartExclude.cancelDownload}
        onConfirm={() => void smartExclude.confirmDownload()}
      />
      {children}
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
