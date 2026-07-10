import { useAtom } from "@effect-atom/atom-solid";
import { restoreAlignerWorkSession } from "@lisca/client/session/aligner-work-session-restore";
import { resumeCropPendingRun } from "@lisca/client/session/resume-pending-runs";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import { onMount, type JSX } from "solid-js";

import { alignerClient } from "../api/aligner-port";
import { alignerUiActions, alignerUiAtom, readAlignerSession } from "../atoms/aligner-ui-atoms";

export function AlignerWorkSessionGate(props: { children?: JSX.Element }) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(alignerUiAtom);
  const persistedSession = readAlignerSession();

  onMount(() => {
    const session = readAlignerSession();
    if (!session?.workspacePath) return;
    workspace.setWorkspacePath(session.workspacePath);
    void resumeCropPendingRun({
      client: alignerClient,
      workspacePath: session.workspacePath,
      onProgress: (progress) => alignerUiActions.setCropProgress(setUi, progress),
    });
  });

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
      {props.children}
    </WorkSessionAppGate>
  );
}