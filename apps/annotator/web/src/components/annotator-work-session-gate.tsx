import { useAtom } from "@effect-atom/atom-solid";
import { restoreAnnotatorWorkSession } from "@lisca/client/session/annotator-work-session-restore";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import { onMount, type JSX } from "solid-js";

import { annotatorUiActions, annotatorUiAtom, readAnnotatorSession } from "../atoms/annotator-ui-atoms";

export function AnnotatorWorkSessionGate(props: { children?: JSX.Element }) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(annotatorUiAtom);
  const persistedSession = readAnnotatorSession();

  onMount(() => {
    const session = readAnnotatorSession();
    if (!session?.workspacePath) return;
    workspace.setWorkspacePath(session.workspacePath);
  });

  return (
    <WorkSessionAppGate
      appId="annotator"
      gateOptions={{ skipResumePicker: persistedSession != null }}
      PickerDialog={WorkSessionPickerDialog}
      onRestore={(session) => {
        void restoreAnnotatorWorkSession({
          session,
          setShellWorkspacePath: workspace.setWorkspacePath,
          setWorkspacePath: annotatorUiActions.setWorkspacePath,
          setUi,
        });
      }}
    >
      {props.children}
    </WorkSessionAppGate>
  );
}