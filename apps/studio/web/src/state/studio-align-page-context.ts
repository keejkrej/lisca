import { createContext, useContext } from "solid-js";

import type { useSmartExclude } from "@lisca/smart/exclude/request";
import type { useVarExclude } from "@lisca/smart/var-exclude";

import type { StudioAlignState } from "./use-studio-align-state";

export type StudioSmartExclude = ReturnType<typeof useSmartExclude>;
export type StudioVarExclude = ReturnType<typeof useVarExclude>;

export type StudioAlignPageContextValue = {
  state: StudioAlignState;
  smartExclude: StudioSmartExclude;
  varExclude: StudioVarExclude;
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