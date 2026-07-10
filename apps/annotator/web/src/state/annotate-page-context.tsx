import { createContext, useContext, type JSX } from "solid-js";

import { useAnnotateState, type AnnotateState } from "./use-annotate-state";
type AnnotatePageContextValue = {
  state: AnnotateState;
};

const AnnotatePageContext = createContext<AnnotateState | null>(null);

export function AnnotatePageProvider(props: { children?: JSX.Element }) {
  const state = useAnnotateState();
  return <AnnotatePageContext.Provider value={state}>{props.children}</AnnotatePageContext.Provider>;
}

export function useAnnotatePage(): AnnotatePageContextValue {
  const state = useContext(AnnotatePageContext);
  if (!state) {
    throw new Error("useAnnotatePage must be used within AnnotatePageProvider");
  }
  return { state };
}