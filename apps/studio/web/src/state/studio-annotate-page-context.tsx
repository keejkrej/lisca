import { createContext, useContext, type JSX } from "solid-js";
import { useStudioAnnotateState, type StudioAnnotateState } from "./use-studio-annotate-state";

type StudioAnnotatePageContextValue = {
  state: StudioAnnotateState;
};

const StudioAnnotatePageContext = createContext<StudioAnnotateState | null>(null);

export function StudioAnnotatePageProvider(props: { children?: JSX.Element }) {
  const state = useStudioAnnotateState();
  return (
    <StudioAnnotatePageContext.Provider value={state}>{props.children}</StudioAnnotatePageContext.Provider>
  );
}

export function useStudioAnnotatePage(): StudioAnnotatePageContextValue {
  const state = useContext(StudioAnnotatePageContext);
  if (!state) {
    throw new Error("useStudioAnnotatePage must be used within StudioAnnotatePageProvider");
  }
  return { state };
}