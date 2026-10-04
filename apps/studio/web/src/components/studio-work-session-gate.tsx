import type { StateUpdater } from "@lisca/client/atoms/align-ui";
import type { StudioWizardData } from "@lisca/client/atoms/studio-ui";
import type { AnalysisProgress } from "@lisca/contracts";
import { useAtom, useAtomSet } from "@effect/atom-solid";
import { runClientEffect } from "@lisca/client/runtime";
import { resumeStudioPendingRuns } from "@lisca/client/session/resume-pending-runs";
import { createSubscriptionOwner } from "@lisca/client/session/subscription-owner";
import { restoreStudioWorkSession } from "@lisca/client/session/studio-work-session-restore";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import type { StudioAssayJson } from "@lisca/contracts/assay";
import { useShellWorkspace, WorkSessionPickerDialog } from "@lisca/ui/shell";
import { onCleanup, onMount, type JSX } from "solid-js";

import { studioClient } from "../api/studio-port";
import { invalidateRoiWorkspaceAtom } from "../atoms/studio-query-atoms";
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
import { StudioSessionContext } from "../state/studio-session-context";
import { bindStudioCropRefresh } from "../state/studio-crop-watch";
import { parseStudioAssayJson, studioWizardActions, studioWizardAtom } from "../state/studio-store";

export function StudioWorkSessionGate(props: { children?: JSX.Element }) {
  const workspace = useShellWorkspace();
  const [, setAlignUi] = useAtom(() => studioAlignUiAtom);
  const [, setAnnotateUi] = useAtom(() => studioAnnotateUiAtom);
  const [, setWizard] = useAtom(() => studioWizardAtom);
  const pendingRunSubscription = createSubscriptionOwner();
  const invalidateRoi = useAtomSet(() => invalidateRoiWorkspaceAtom, { mode: "promise" });
  const releaseCropRefresh = bindStudioCropRefresh((workspacePath) => {
    void invalidateRoi(workspacePath);
  });
  onCleanup(releaseCropRefresh);

  const attachPendingRuns = async (workspacePath: string) => {
    await pendingRunSubscription.replace(() =>
      resumeStudioPendingRuns({
        client: studioClient,
        workspacePath,
        onCropProgress: (progress) => studioAlignUiActions.setCropProgress(setAlignUi, progress),
        onRestoredCropTerminal: (progress) => {
          if (progress.status === "error") {
            studioAlignUiActions.setError(setAlignUi, progress.error ?? "Crop failed");
          } else {
            studioAlignUiActions.setStatus(setAlignUi, progress.message ?? "Crop finished");
          }
          if (progress.status === "completed") void invalidateRoi(workspacePath);
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

  const openAssay = (assayJsonPath: string) =>
    restoreStudioSession(
      assayJsonPath,
      setWizard,
      setAlignUi,
      setAnnotateUi,
      workspace.setWorkspacePath,
      attachPendingRuns,
    );

  return (
    <WorkSessionAppGate
      appId="studio"
      // No welcome picker: Studio starts on the Assay page, where Open lists recent assays.
      gateOptions={{ skipResumePicker: true }}
      PickerDialog={WorkSessionPickerDialog}
      onRestore={(session) => {
        const assayJsonPath = session.assayJsonPath?.trim();
        if (assayJsonPath) void openAssay(assayJsonPath);
      }}
    >
      <StudioSessionContext.Provider value={{ openAssay }}>
        {props.children}
      </StudioSessionContext.Provider>
    </WorkSessionAppGate>
  );
}

async function restoreStudioSession(
  assayJsonPath: string,
  setWizard: (update: StateUpdater<StudioWizardData>) => void,
  setAlignUi: (update: StateUpdater<import("@lisca/client/atoms/align-ui").AlignUiState>) => void,
  setAnnotateUi: (update: StateUpdater<StudioAnnotateStoreState>) => void,
  setShellWorkspacePath: (path: string | null) => void,
  attachPendingRuns: (workspacePath: string) => Promise<void>,
): Promise<StudioAssayJson> {
  let loaded: StudioAssayJson | undefined;
  await restoreStudioWorkSession({
    assayJsonPath,
    readAssayJson: async (path) => {
      const contents = await runClientEffect(studioClient.readTextFile(path));
      loaded = parseStudioAssayJson(contents);
      return loaded;
    },
    loadAssayJson: (assayJson) => studioWizardActions.loadAssayJson(setWizard, assayJson),
    setShellWorkspacePath,
    setAlignWorkspacePath: (path) => studioAlignUiActions.setWorkspacePath(setAlignUi, path),
    setAnnotateWorkspacePath: (path) =>
      studioAnnotateUiActions.setWorkspacePath(setAnnotateUi, path),
    setAlignSource: (source) => studioAlignUiActions.setSource(setAlignUi, source),
    // Reattach in the background: a lookup failure must not block opening the assay.
    resumePendingRuns: async (workspacePath) => {
      void attachPendingRuns(workspacePath).catch(() => undefined);
    },
  });
  return loaded!;
}
