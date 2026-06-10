import { createContext, useContext, type ReactNode } from "react";
import { useStudioAnnotateState, type StudioAnnotateState } from "./use-studio-annotate-state";
type StudioAnnotatePageContextValue = {
  state: StudioAnnotateState;
};
const StudioAnnotatePageContext = createContext<StudioAnnotatePageContextValue | null>(null);
export function StudioAnnotatePageProvider({ children }: { children: ReactNode }) {
  const state = useStudioAnnotateState();
  const value = {
    state,
  };
  return (
    <StudioAnnotatePageContext.Provider value={value}>
      {children}
    </StudioAnnotatePageContext.Provider>
  );
}
export function useStudioAnnotatePage(): StudioAnnotatePageContextValue {
  const context = useContext(StudioAnnotatePageContext);
  if (!context) {
    throw new Error("useStudioAnnotatePage must be used within StudioAnnotatePageProvider");
  }
  return context;
}
