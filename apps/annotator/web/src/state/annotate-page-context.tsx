import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useAnnotateState } from "./use-annotate-state";

type AnnotateState = ReturnType<typeof useAnnotateState>;

type AnnotatePageContextValue = {
  state: AnnotateState;
};

const AnnotatePageContext = createContext<AnnotatePageContextValue | null>(null);

export function AnnotatePageProvider({ children }: { children: ReactNode }) {
  const state = useAnnotateState();
  const value = useMemo(() => ({ state }), [state]);
  return <AnnotatePageContext.Provider value={value}>{children}</AnnotatePageContext.Provider>;
}

export function useAnnotatePage(): AnnotatePageContextValue {
  const context = useContext(AnnotatePageContext);
  if (!context) {
    throw new Error("useAnnotatePage must be used within AnnotatePageProvider");
  }
  return context;
}
