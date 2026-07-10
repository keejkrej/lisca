import { useAtom } from "@effect-atom/atom-solid";
import { restoreAnnotatorWorkSession } from "@lisca/client/session/annotator-work-session-restore";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import type { JSX } from "solid-js";

import { annotatorUiActions, annotatorUiAtom } from "../atoms/annotator-ui-atoms";

export function AnnotatorWorkSessionGate(props: { children?: JSX.Element }) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(annotatorUiAtom);

  return (
    <WorkSessionAppGate
      appId="annotator"
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