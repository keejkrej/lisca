import type { AlignUiState, StateUpdater } from "@lisca/client/atoms/align-ui";
import { useAtom } from "@effect-atom/atom-react";
import { resumeCropPendingRun } from "@lisca/client/session/resume-pending-runs";
import { touchWorkSession } from "@lisca/client/session/work-session";
import { WorkSessionBootstrap, type WorkSession } from "@lisca/client/session/work-session-gate";
import { toWorkSessionPickerItems } from "@lisca/ui-headless/work-session-picker";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui-native";
import type { ReactNode } from "react";

import { alignerClient } from "../api/aligner-port";
import { alignerUiActions, alignerUiAtom } from "../atoms/aligner-ui-atoms";

type AlignerWorkSessionGateProps = {
  children: ReactNode;
};

export function AlignerWorkSessionGate({ children }: AlignerWorkSessionGateProps) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(alignerUiAtom);

  return (
    <WorkSessionBootstrap
      appId="aligner"
      onRestore={async (session) => {
        await restoreAlignerSession(session, setUi, workspace.setWorkspacePath);
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

async function restoreAlignerSession(
  session: WorkSession,
  setUi: (update: StateUpdater<AlignUiState>) => void,
  setShellWorkspacePath: (path: string | null) => void,
) {
  const source = session.source ?? null;
  setShellWorkspacePath(session.workspacePath);
  alignerUiActions.setWorkspacePath(setUi, session.workspacePath);
  if (source) {
    alignerUiActions.setSource(setUi, source);
  }
  touchWorkSession("aligner", {
    server: session.server,
    workspacePath: session.workspacePath,
    source,
    snapshot: session.snapshot,
  });
  await resumeCropPendingRun({
    client: alignerClient,
    workspacePath: session.workspacePath,
    onProgress: (progress) => alignerUiActions.setCropProgress(setUi, progress),
  });
}
