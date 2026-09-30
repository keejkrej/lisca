import { useAtom } from "@effect/atom-solid";
import { restoreAlignerWorkSession } from "@lisca/client/session/aligner-work-session-restore";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import { onMount, type JSX } from "solid-js";

import { alignerUiActions, alignerUiAtom, readAlignerSession } from "../atoms/aligner-ui-atoms";

/** Aligner work-session gate — no crop recovery (crop is Studio/CLI only). */
export function AlignerWorkSessionGate(props: { children?: JSX.Element }) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(() => alignerUiAtom);

  onMount(() => {
    const session = readAlignerSession();
    if (!session?.workspacePath) return;
    workspace.setWorkspacePath(session.workspacePath);
  });

  return (
    <WorkSessionAppGate
      appId="aligner"
      // No resume dialog: the workspace picker lists recent sessions as chips instead.
      gateOptions={{ skipResumePicker: true }}
      PickerDialog={WorkSessionPickerDialog}
      onRestore={(session) =>
        restoreAlignerWorkSession({
          session,
          setShellWorkspacePath: workspace.setWorkspacePath,
          setWorkspacePath: alignerUiActions.setWorkspacePath,
          setSource: alignerUiActions.setSource,
          setUi,
          resumePendingRuns: async () => {
            // Crop jobs are not owned by Aligner.
          },
        })
      }
    >
      {props.children}
    </WorkSessionAppGate>
  );
}
