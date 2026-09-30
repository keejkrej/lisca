import type { StudioAssayJson } from "@lisca/contracts/assay";
import { createContext, useContext } from "solid-js";

export type StudioSessionContextValue = {
  /**
   * Load an assay.json into the wizard, point Align/Annotate at its workspace, and
   * reattach any crop or analysis run still going there.
   */
  openAssay: (assayJsonPath: string) => Promise<StudioAssayJson>;
};

export const StudioSessionContext = createContext<StudioSessionContextValue>();

export function useStudioSession(): StudioSessionContextValue {
  const context = useContext(StudioSessionContext);
  if (!context) throw new Error("useStudioSession must be used within StudioWorkSessionGate");
  return context;
}
