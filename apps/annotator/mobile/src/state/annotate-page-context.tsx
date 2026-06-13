import { createContext, useContext, type ReactNode } from "react";

import { useAnnotateState } from "./use-annotate-state";

type AnnotateState = ReturnType<typeof useAnnotateState>;

const AnnotatePageContext = createContext<AnnotateState | null>(null);

export function AnnotatePageProvider({ children }: { children: ReactNode }) {
  const state = useAnnotateState();
  return <AnnotatePageContext.Provider value={state}>{children}</AnnotatePageContext.Provider>;
}

export function useAnnotatePage(): { state: AnnotateState } {
  const state = useContext(AnnotatePageContext);
  if (!state) {
    throw new Error("useAnnotatePage must be used within AnnotatePageProvider");
  }
  return { state };
}
