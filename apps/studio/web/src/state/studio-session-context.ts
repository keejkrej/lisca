import type { StudioAssayJson } from "@lisca/contracts/assay";
import { Context } from "effect";

export type StudioSessionContextValue = {
  /**
   * Load an assay.json into the wizard, point Align/Annotate at its workspace, and
   * reattach any crop or analysis run still going there.
   */
  readonly openAssay: (assayJsonPath: string) => Promise<StudioAssayJson>;
};

export const StudioSessionPort = Context.Reference<StudioSessionContextValue | null>(
  "lisca/StudioSessionPort",
  { defaultValue: () => null },
);

let activeStudioSession: StudioSessionContextValue | null = null;

export function setActiveStudioSession(session: StudioSessionContextValue | null): void {
  activeStudioSession = session;
}

export function getActiveStudioSession(): StudioSessionContextValue {
  if (!activeStudioSession) {
    throw new Error("Studio session is not active (StudioWorkSessionGate not mounted)");
  }
  return activeStudioSession;
}
