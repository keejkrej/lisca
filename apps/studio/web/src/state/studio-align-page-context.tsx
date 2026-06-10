import { createContext, useContext, type ReactNode } from "react";
import { useStudioAlignState, type StudioAlignState } from "./use-studio-align-state";

type StudioAlignPageContextValue = {
  state: StudioAlignState;
};

const StudioAlignPageContext = createContext<StudioAlignState | null>(null);

export function StudioAlignPageProvider({ children }: { children: ReactNode }) {
  const state = useStudioAlignState();
  return <StudioAlignPageContext.Provider value={state}>{children}</StudioAlignPageContext.Provider>;
}

export function useStudioAlignPage(): StudioAlignPageContextValue {
  const state = useContext(StudioAlignPageContext);
  if (!state) {
    throw new Error("useStudioAlignPage must be used within StudioAlignPageProvider");
  }
  return { state };
}
