import { useAtom } from "@effect-atom/atom-react";
import { restoreAlignerWorkSession } from "@lisca/client/session/aligner-work-session-restore";
import { resumeCropPendingRun } from "@lisca/client/session/resume-pending-runs";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import { useEffect, type ReactNode } from "react";

import { alignerClient } from "../api/aligner-port";
import { alignerUiActions, alignerUiAtom, readAlignerSession } from "../atoms/aligner-ui-atoms";

type AlignerWorkSessionGateProps = {
  children: ReactNode;
};

export function AlignerWorkSessionGate({ children }: AlignerWorkSessionGateProps) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(alignerUiAtom);
  const persistedSession = readAlignerSession();

  useEffect(() => {
    const session = readAlignerSession();
    if (!session?.workspacePath) return;
    workspace.setWorkspacePath(session.workspacePath);
    void resumeCropPendingRun({
      client: alignerClient,
      workspacePath: session.workspacePath,
      onProgress: (progress) => alignerUiActions.setCropProgress(setUi, progress),
    });
  }, [setUi, workspace]);

  return (
    <WorkSessionAppGate
      appId="aligner"
      gateOptions={{ skipResumePicker: persistedSession != null }}
      PickerDialog={WorkSessionPickerDialog}
      onRestore={async (session) => {
        await restoreAlignerWorkSession({
          session,
          setShellWorkspacePath: workspace.setWorkspacePath,
          setWorkspacePath: alignerUiActions.setWorkspacePath,
          setSource: alignerUiActions.setSource,
          setUi,
          resumePendingRuns: async (workspacePath) => {
            await resumeCropPendingRun({
              client: alignerClient,
              workspacePath,
              onProgress: (progress) => alignerUiActions.setCropProgress(setUi, progress),
            });
          },
        });
      }}
    >
      {children}
    </WorkSessionAppGate>
  );
}
