import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useStudioAlignState, type StudioAlignState } from "./use-studio-align-state";

type StudioAlignPageContextValue = {
  state: StudioAlignState;
};

const StudioAlignPageContext = createContext<StudioAlignPageContextValue | null>(null);

export function StudioAlignPageProvider({ children }: { children: ReactNode }) {
  const state = useStudioAlignState();
  const value = useMemo(() => ({ state }), [state]);
  return <StudioAlignPageContext.Provider value={value}>{children}</StudioAlignPageContext.Provider>;
}

export function useStudioAlignPage(): StudioAlignPageContextValue {
  const context = useContext(StudioAlignPageContext);
  if (!context) {
    throw new Error("useStudioAlignPage must be used within StudioAlignPageProvider");
  }
  return context;
}
