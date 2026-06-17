import { useAtom } from "@effect-atom/atom-react";
import { restoreAlignerWorkSession } from "@lisca/client/session/aligner-work-session-restore";
import { resumeCropPendingRun } from "@lisca/client/session/resume-pending-runs";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
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
    <WorkSessionAppGate
      appId="aligner"
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
