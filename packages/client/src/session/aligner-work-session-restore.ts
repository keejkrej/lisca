import type { AlignUiState, StateUpdater } from "../atoms/align-ui";
import type { AlignerSource } from "@lisca/contracts";

import { touchWorkSession, type WorkSession } from "./work-session";

export type RestoreAlignerWorkSessionArgs = {
  session: WorkSession;
  setShellWorkspacePath: (path: string | null) => void;
  setWorkspacePath: (
    setUi: (update: StateUpdater<AlignUiState>) => void,
    workspacePath: string | null,
  ) => void;
  setSource: (
    setUi: (update: StateUpdater<AlignUiState>) => void,
    source: AlignerSource | null,
  ) => void;
  setUi: (update: StateUpdater<AlignUiState>) => void;
  resumePendingRuns: (workspacePath: string) => Promise<void>;
};

export async function restoreAlignerWorkSession({
  session,
  setShellWorkspacePath,
  setWorkspacePath,
  setSource,
  setUi,
  resumePendingRuns,
}: RestoreAlignerWorkSessionArgs): Promise<boolean> {
  const source = session.source ?? null;
  const workspacePath = session.workspacePath?.trim();
  if (!workspacePath || !source) return false;

  setShellWorkspacePath(workspacePath);
  setWorkspacePath(setUi, workspacePath);
  setSource(setUi, source);
  touchWorkSession("aligner", {
    server: session.server,
    workspacePath,
    source,
    snapshot: session.snapshot,
  });
  await resumePendingRuns(workspacePath);
  return true;
}
