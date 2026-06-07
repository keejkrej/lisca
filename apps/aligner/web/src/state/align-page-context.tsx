import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useAlignState, type AlignState } from "./use-align-state";

type AlignPageContextValue = {
  state: AlignState;
  actions: Pick<AlignState, "setSource" | "setSelection" | "setContrast" | "setGrid" | "setToolMode">;
  meta: {
    scanLoading: boolean;
    frameLoading: boolean;
    saving: boolean;
    cropping: boolean;
  };
};

const AlignPageContext = createContext<AlignPageContextValue | null>(null);

export function AlignPageProvider({ children }: { children: ReactNode }) {
  const state = useAlignState();
  const actions = useMemo(
    () => ({
      setSource: state.setSource,
      setSelection: state.setSelection,
      setContrast: state.setContrast,
      setGrid: state.setGrid,
      setToolMode: state.setToolMode,
    }),
    [
      state.setContrast,
      state.setGrid,
      state.setSelection,
      state.setSource,
      state.setToolMode,
    ],
  );
  const meta = useMemo(
    () => ({
      scanLoading: state.scanLoading,
      frameLoading: state.frameLoading,
      saving: state.saving,
      cropping: state.cropping,
    }),
    [state.cropping, state.frameLoading, state.saving, state.scanLoading],
  );
  const value = useMemo(
    () => ({ state, actions, meta }),
    [actions, meta, state],
  );

  return <AlignPageContext.Provider value={value}>{children}</AlignPageContext.Provider>;
}

export function useAlignPage(): AlignPageContextValue {
  const context = useContext(AlignPageContext);
  if (!context) {
    throw new Error("useAlignPage must be used within AlignPageProvider");
  }
  return context;
}
