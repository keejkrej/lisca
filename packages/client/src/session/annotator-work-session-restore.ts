import type { AnnotatorUiState, StateUpdater } from "../atoms/annotator-ui";

import { touchWorkSession, type WorkSession } from "./work-session";

export type RestoreAnnotatorWorkSessionArgs = {
  session: WorkSession;
  setShellWorkspacePath: (path: string | null) => void;
  setWorkspacePath: (
    setUi: (update: StateUpdater<AnnotatorUiState>) => void,
    workspacePath: string | null,
  ) => void;
  setUi: (update: StateUpdater<AnnotatorUiState>) => void;
};

export function restoreAnnotatorWorkSession({
  session,
  setShellWorkspacePath,
  setWorkspacePath,
  setUi,
}: RestoreAnnotatorWorkSessionArgs): boolean {
  const workspacePath = session.workspacePath?.trim();
  if (!workspacePath) return false;

  setShellWorkspacePath(workspacePath);
  setWorkspacePath(setUi, workspacePath);
  touchWorkSession("annotator", {
    server: session.server,
    workspacePath,
    snapshot: session.snapshot,
  });
  return true;
}
