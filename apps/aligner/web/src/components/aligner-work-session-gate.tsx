import { useAtom } from "@effect-atom/atom-solid";
import { restoreAlignerWorkSession } from "@lisca/client/session/aligner-work-session-restore";
import { resumeCropPendingRun } from "@lisca/client/session/resume-pending-runs";
import { acknowledgeCropRecovery } from "@lisca/client/session/crop-recovery";
import { currentServerKey } from "@lisca/client/session/work-session";
import { createSubscriptionOwner } from "@lisca/client/session/subscription-owner";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import { onCleanup, onMount, type JSX } from "solid-js";

import { alignerClient } from "../api/aligner-port";
import { alignerUiActions, alignerUiAtom, readAlignerSession } from "../atoms/aligner-ui-atoms";

export function AlignerWorkSessionGate(props: { children?: JSX.Element }) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(alignerUiAtom);
  const persistedSession = readAlignerSession();
  const cropSubscription = createSubscriptionOwner();

  const attachCrop = async (workspacePath: string) => {
    await cropSubscription.replace(async () => {
      const serverIdentity = currentServerKey("aligner");
      const resumed = await resumeCropPendingRun({
        client: alignerClient,
        serverIdentity,
        workspacePath,
        onProgress: (progress) => alignerUiActions.setCropProgress(setUi, progress),
        onTerminal: (progress) => {
          if (progress.status === "error") {
            alignerUiActions.setError(setUi, progress.error ?? "Crop failed");
          } else {
            alignerUiActions.setStatus(setUi, progress.message ?? "Crop finished");
          }
        },
      });
      if (resumed.kind === "terminal" && !resumed.acknowledged) {
        alignerUiActions.setCropProgress(setUi, resumed.progress);
        if (resumed.progress.status === "error") {
          alignerUiActions.setError(setUi, resumed.progress.error ?? "Crop failed");
        } else {
          alignerUiActions.setStatus(setUi, resumed.progress.message ?? "Crop finished");
        }
        acknowledgeCropRecovery(serverIdentity, workspacePath, resumed.progress.requestId);
      }
      return resumed.kind === "active" ? resumed.stop : () => {};
    });
  };

  onMount(() => {
    const session = readAlignerSession();
    if (!session?.workspacePath) return;
    workspace.setWorkspacePath(session.workspacePath);
    void attachCrop(session.workspacePath);
  });
  onCleanup(() => cropSubscription.clear());

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
            await attachCrop(workspacePath);
          },
        });
      }}
    >
      {props.children}
    </WorkSessionAppGate>
  );
}
