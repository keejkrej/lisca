import type { AnnotatorUiState, StateUpdater } from "@lisca/client/atoms/annotator-ui";
import { useAtom } from "@effect-atom/atom-react";
import { touchWorkSession } from "@lisca/client/session/work-session";
import { WorkSessionBootstrap, type WorkSession } from "@lisca/client/session/work-session-gate";
import { toWorkSessionPickerItems } from "@lisca/ui-headless/work-session-picker";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import type { ReactNode } from "react";

import { annotatorUiActions, annotatorUiAtom } from "../atoms/annotator-ui-atoms";

type AnnotatorWorkSessionGateProps = {
  children: ReactNode;
};

export function AnnotatorWorkSessionGate({ children }: AnnotatorWorkSessionGateProps) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(annotatorUiAtom);

  return (
    <WorkSessionBootstrap
      appId="annotator"
      onRestore={async (session) => {
        restoreAnnotatorSession(session, setUi, workspace.setWorkspacePath);
      }}
    >
      {(gate) => (
        <>
          {gate.ready ? children : null}
          <WorkSessionPickerDialog
            open={gate.open}
            sessions={toWorkSessionPickerItems(gate.sessions)}
            onRestore={(sessionId) => {
              const session = gate.sessions.find((entry) => entry.id === sessionId);
              if (session) gate.restoreSession(session);
            }}
            onStartNew={gate.startNewSession}
          />
        </>
      )}
    </WorkSessionBootstrap>
  );
}

function restoreAnnotatorSession(
  session: WorkSession,
  setUi: (update: StateUpdater<AnnotatorUiState>) => void,
  setShellWorkspacePath: (path: string | null) => void,
) {
  setShellWorkspacePath(session.workspacePath);
  annotatorUiActions.setWorkspacePath(setUi, session.workspacePath);
  touchWorkSession("annotator", {
    server: session.server,
    workspacePath: session.workspacePath,
    snapshot: session.snapshot,
  });
}
