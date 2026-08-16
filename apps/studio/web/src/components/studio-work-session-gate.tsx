import type { StateUpdater } from "@lisca/client/atoms/align-ui";
import type { StudioWizardData } from "@lisca/client/atoms/studio-ui";
import type { AnalysisProgress } from "@lisca/contracts";
import { useAtom } from "@effect-atom/atom-solid";
import { runClientEffect } from "@lisca/client/runtime";
import { resumeStudioPendingRuns } from "@lisca/client/session/resume-pending-runs";
import { currentServerKey } from "@lisca/client/session/work-session";
import { createSubscriptionOwner } from "@lisca/client/session/subscription-owner";
import { restoreStudioWorkSession } from "@lisca/client/session/studio-work-session-restore";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import type { WorkSession } from "@lisca/client/session/work-session-gate";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import { onCleanup, onMount, type JSX } from "solid-js";

import { studioClient } from "../api/studio-port";
import {
  readStudioAlignSession,
  studioAlignUiActions,
  studioAlignUiAtom,
} from "../state/studio-align-store";
import {
  studioAnnotateUiActions,
  studioAnnotateUiAtom,
  type StudioAnnotateStoreState,
} from "../state/studio-annotate-store";
import { parseStudioAssayJson, studioWizardActions, studioWizardAtom } from "../state/studio-store";

export function StudioWorkSessionGate(props: { children?: JSX.Element }) {
  const workspace = useShellWorkspace();
  const [, setAlignUi] = useAtom(studioAlignUiAtom);
  const [, setAnnotateUi] = useAtom(studioAnnotateUiAtom);
  const [, setWizard] = useAtom(studioWizardAtom);
  const persistedSession = readStudioAlignSession();
  const pendingRunSubscription = createSubscriptionOwner();

  const attachPendingRuns = async (workspacePath: string) => {
    await pendingRunSubscription.replace(() =>
      resumeStudioPendingRuns({
        client: studioClient,
        serverIdentity: currentServerKey("studio"),
        workspacePath,
        onCropProgress: (progress) => studioAlignUiActions.setCropProgress(setAlignUi, progress),
        onRestoredCropTerminal: (progress) => {
          if (progress.status === "error") {
            studioAlignUiActions.setError(setAlignUi, progress.error ?? "Crop failed");
          } else {
            studioAlignUiActions.setStatus(setAlignUi, progress.message ?? "Crop finished");
          }
        },
        onAnalysisProgress: (progress: AnalysisProgress) =>
          studioAnnotateUiActions.setAnalysisProgress(setAnnotateUi, progress),
      }),
    );
  };

  onMount(() => {
    const alignSession = readStudioAlignSession();
    if (alignSession) {
      studioAlignUiActions.setSpacingZoomLocked(setAlignUi, alignSession.spacingZoomLocked);
      studioAlignUiActions.setPatternZoomLocked(setAlignUi, alignSession.patternZoomLocked);
    }
    if (alignSession?.workspacePath) {
      workspace.setWorkspacePath(alignSession.workspacePath);
      void attachPendingRuns(alignSession.workspacePath);
    }
  });
  onCleanup(() => pendingRunSubscription.clear());

  return (
    <WorkSessionAppGate
      appId="studio"
      gateOptions={{ skipResumePicker: persistedSession != null }}
      PickerDialog={WorkSessionPickerDialog}
      onRestore={(session) =>
        restoreStudioSession(
          session,
          setWizard,
          setAlignUi,
          setAnnotateUi,
          workspace.setWorkspacePath,
          attachPendingRuns,
        )
      }
    >
      {props.children}
    </WorkSessionAppGate>
  );
}

async function restoreStudioSession(
  session: WorkSession,
  setWizard: (update: StateUpdater<StudioWizardData>) => void,
  setAlignUi: (update: StateUpdater<import("@lisca/client/atoms/align-ui").AlignUiState>) => void,
  setAnnotateUi: (update: StateUpdater<StudioAnnotateStoreState>) => void,
  setShellWorkspacePath: (path: string | null) => void,
  attachPendingRuns: (workspacePath: string) => Promise<void>,
) {
  const assayJsonPath = session.assayJsonPath?.trim();
  if (!assayJsonPath) return;

  await restoreStudioWorkSession({
    assayJsonPath,
    readAssayJson: async (path) => {
      const contents = await runClientEffect(studioClient.readTextFile(path));
      return parseStudioAssayJson(contents);
    },
    loadAssayJson: (assayJson) => studioWizardActions.loadAssayJson(setWizard, assayJson),
    setShellWorkspacePath,
    setAlignWorkspacePath: (path) => studioAlignUiActions.setWorkspacePath(setAlignUi, path),
    setAnnotateWorkspacePath: (path) =>
      studioAnnotateUiActions.setWorkspacePath(setAnnotateUi, path),
    setAlignSource: (source) => studioAlignUiActions.setSource(setAlignUi, source),
    resumePendingRuns: async (workspacePath) => {
      await attachPendingRuns(workspacePath);
    },
  });
}
