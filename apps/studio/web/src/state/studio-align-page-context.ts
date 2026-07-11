import { createContext, useContext } from "solid-js";

import type { useSmartExclude } from "@lisca/smart/exclude/request";

import type { StudioAlignState } from "./use-studio-align-state";

export type StudioSmartExclude = ReturnType<typeof useSmartExclude>;

export type StudioAlignPageContextValue = {
  state: StudioAlignState;
  smartExclude: StudioSmartExclude;
  saveAndAdvance: () => Promise<boolean>;
};

export const StudioAlignPageContext = createContext<StudioAlignPageContextValue | null>(null);

export function useStudioAlignPage(): StudioAlignPageContextValue {
  const value = useContext(StudioAlignPageContext);
  if (!value) {
    throw new Error("useStudioAlignPage must be used within StudioAlignPageProvider");
  }
  return value;
}