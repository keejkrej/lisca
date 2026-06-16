import { useAtom } from "@effect-atom/atom-react";
import { restoreAnnotatorWorkSession } from "@lisca/client/session/annotator-work-session-restore";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui-native";
import type { ReactNode } from "react";

import { annotatorUiActions, annotatorUiAtom } from "../atoms/annotator-ui-atoms";

type AnnotatorWorkSessionGateProps = {
  children: ReactNode;
};

export function AnnotatorWorkSessionGate({ children }: AnnotatorWorkSessionGateProps) {
  const workspace = useShellWorkspace();
  const [, setUi] = useAtom(annotatorUiAtom);

  return (
    <WorkSessionAppGate
      appId="annotator"
      PickerDialog={WorkSessionPickerDialog}
      onRestore={(session) =>
        restoreAnnotatorWorkSession({
          session,
          setShellWorkspacePath: workspace.setWorkspacePath,
          setWorkspacePath: annotatorUiActions.setWorkspacePath,
          setUi,
        })
      }
    >
      {children}
    </WorkSessionAppGate>
  );
}
