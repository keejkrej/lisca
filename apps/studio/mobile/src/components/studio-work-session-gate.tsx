import type { StateUpdater } from "@lisca/client/atoms/align-ui";
import type { AnalysisProgress } from "@lisca/contracts";
import { useAtom } from "@effect-atom/atom-react";
import { resumeStudioPendingRuns } from "@lisca/client/session/resume-pending-runs";
import { touchWorkSession } from "@lisca/client/session/work-session";
import { WorkSessionBootstrap, type WorkSession } from "@lisca/client/session/work-session-gate";
import { toWorkSessionPickerItems } from "@lisca/ui-headless/work-session-picker";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui-native";
import type { ReactNode } from "react";

import { studioClient } from "../api/studio-port";
import { studioAlignUiActions, studioAlignUiAtom } from "../state/studio-align-store";
import {
  studioAnnotateUiActions,
  studioAnnotateUiAtom,
  type StudioAnnotateStoreState,
} from "../state/studio-annotate-store";

type StudioWorkSessionGateProps = {
  children: ReactNode;
};

export function StudioWorkSessionGate({ children }: StudioWorkSessionGateProps) {
  const workspace = useShellWorkspace();
  const [, setAlignUi] = useAtom(studioAlignUiAtom);
  const [, setAnnotateUi] = useAtom(studioAnnotateUiAtom);

  return (
    <WorkSessionBootstrap
      appId="studio"
      onRestore={async (session) => {
        await restoreStudioSession(session, setAlignUi, setAnnotateUi, workspace.setWorkspacePath);
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

async function restoreStudioSession(
  session: WorkSession,
  setAlignUi: (update: StateUpdater<import("@lisca/client/atoms/align-ui").AlignUiState>) => void,
  setAnnotateUi: (update: StateUpdater<StudioAnnotateStoreState>) => void,
  setShellWorkspacePath: (path: string | null) => void,
) {
  setShellWorkspacePath(session.workspacePath);
  studioAlignUiActions.setWorkspacePath(setAlignUi, session.workspacePath);
  studioAnnotateUiActions.setWorkspacePath(setAnnotateUi, session.workspacePath);
  if (session.source) {
    studioAlignUiActions.setSource(setAlignUi, session.source);
  }
  touchWorkSession("studio", {
    server: session.server,
    workspacePath: session.workspacePath,
    source: session.source ?? null,
    snapshot: session.snapshot,
  });
  await resumeStudioPendingRuns({
    client: studioClient,
    workspacePath: session.workspacePath,
    onCropProgress: (progress) => studioAlignUiActions.setCropProgress(setAlignUi, progress),
    onAnalysisProgress: (progress: AnalysisProgress) =>
      studioAnnotateUiActions.setAnalysisProgress(setAnnotateUi, progress),
  });
}
