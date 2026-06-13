import { createContext, useContext, type ReactNode } from "react";
import { useAlignState, type AlignState } from "./use-align-state";

type AlignPageContextValue = {
  state: AlignState;
  actions: Pick<
    AlignState,
    "setSource" | "setSelection" | "setContrast" | "setGrid" | "setToolMode"
  >;
  meta: {
    scanLoading: boolean;
    frameLoading: boolean;
    saving: boolean;
    cropping: boolean;
  };
};

const AlignPageContext = createContext<AlignState | null>(null);

export function AlignPageProvider({ children }: { children: ReactNode }) {
  const state = useAlignState();
  return <AlignPageContext.Provider value={state}>{children}</AlignPageContext.Provider>;
}

export function useAlignPage(): AlignPageContextValue {
  const state = useContext(AlignPageContext);
  if (!state) {
    throw new Error("useAlignPage must be used within AlignPageProvider");
  }
  return {
    state,
    actions: {
      setSource: state.setSource,
      setSelection: state.setSelection,
      setContrast: state.setContrast,
      setGrid: state.setGrid,
      setToolMode: state.setToolMode,
    },
    meta: {
      scanLoading: state.scanLoading,
      frameLoading: state.frameLoading,
      saving: state.saving,
      cropping: state.cropping,
    },
  };
}
