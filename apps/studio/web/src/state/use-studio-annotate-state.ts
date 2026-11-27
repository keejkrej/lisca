import type {
  AnalysisProgress,
  AnalysisStartRequest,
  StudioAnalysisCsvFile,
} from "@lisca/contracts";
import type { StateUpdater } from "@lisca/client/atoms/annotator-ui";
import {
  createAnnotateSessionController,
  type AnnotateState,
} from "@lisca/client/annotate-session/controller";
import { logClientEvent } from "@lisca/client/client-log";
import { runClientEffect } from "@lisca/client/runtime";
import { Effect } from "effect";
import type { AtomRegistry } from "effect/reactivity";

import { studioClient, toErrorMessage } from "../api/studio-port";
import {
  annotationLabelsAtom,
  labelsIdleAtom,
  roiScanIdleAtom,
  roiWorkspaceScanAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} from "../atoms/studio-query-atoms";
import { openStudioTaskCenter } from "../components/studio-task-center-open";
import {
  claimStudioAnalysisRun,
  releaseStudioAnalysisRun,
  runStudioAnalysis,
  scheduleStudioAnalysis,
  studioAnalysisRunActive,
} from "./studio-analysis-run";
import { setStudioAnnotateDirty } from "./studio-annotate-guard";
import { nextStudioAnnotateRoi, previousStudioAnnotateRoi } from "./studio-annotate-navigation";
import {
  studioAnnotateUiActions,
  studioAnnotateUiAtom,
  type StudioAnnotateStoreState,
} from "./studio-annotate-store";
import { studioRegistry } from "./studio-registry";
import {
  buildStudioAssayJsonFromWizard,
  serializeBasicInfoSnapshot,
  studioStoreActions,
  studioWizardAtom,
} from "./studio-store";

export type StudioAnnotateState = AnnotateState & {
  analysisStartConfirm: boolean;
  analysisRequestId: string | null;
  analysisProgress: AnalysisProgress | null;
  analysisResultFiles: StudioAnalysisCsvFile[];
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
  setAnalysisStartConfirm: (value: boolean) => void;
  startAnalysis: () => void;
  canGoToNextSite: boolean;
  goToNextSite: () => void;
  canGoToPreviousSite: boolean;
  goToPreviousSite: () => void;
  requestContinueToAnalysis: () => void;
  workspaceMissing: boolean;
};

export type StudioAnnotateControllerOptions = {
  readonly onNavigate: (to: string) => void;
  readonly registry?: AtomRegistry.AtomRegistry | undefined;
};

export type StudioAnnotateController = {
  readonly getState: () => StudioAnnotateState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly syncExternal: () => void;
  readonly dispose: () => void;
};

export function createStudioAnnotateController(
  options: StudioAnnotateControllerOptions,
): StudioAnnotateController {
  const registry = options.registry ?? studioRegistry;
  let disposed = false;

  const listeners = new Set<() => void>();
  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const getWizard = () => registry.get(studioWizardAtom);
  const activeWorkspacePath = (): string | null => getWizard().workspacePath.trim() || null;

  const getUi = (): StudioAnnotateStoreState => registry.get(studioAnnotateUiAtom);
  const setUi = (update: StateUpdater<StudioAnnotateStoreState>) => {
    const current = registry.get(studioAnnotateUiAtom);
    const next = typeof update === "function" ? update(current) : update;
    if (next !== current) {
      registry.set(studioAnnotateUiAtom, next);
    }
  };

  const syncWorkspaceToUi = () => {
    const path = activeWorkspacePath();
    if (getUi().workspacePath !== path) {
      studioAnnotateUiActions.setWorkspacePath(setUi, path);
    }
  };

  syncWorkspaceToUi();

  const runStartAnalysis = (input: AnalysisStartRequest) =>
    Effect.runPromise(studioClient.startAnalysis(input));

  const session = createAnnotateSessionController({
    registry,
    annotatorClient: studioClient,
    toErrorMessage,
    annotatorUiAtom: studioAnnotateUiAtom,
    annotatorUiActions: studioAnnotateUiActions,
    roiWorkspaceScanAtom,
    roiScanIdleAtom,
    annotationLabelsAtom,
    labelsIdleAtom,
    saveAnnotationLabelsAtom,
    saveRoiFrameAnnotationAtom,
    workspace: {
      getWorkspacePath: activeWorkspacePath,
      setWorkspacePath: (path) => studioAnnotateUiActions.setWorkspacePath(setUi, path),
    },
    guardDirtySelection: (dirty, selectionChanging) => {
      if (!dirty || selectionChanging) return true;
      return window.confirm("Discard unsaved annotation changes?");
    },
  });

  const setAnalysisStartConfirm = (value: boolean) =>
    studioAnnotateUiActions.setAnalysisStartConfirm(setUi, value);
  const setAnalysisRequestId = (requestId: string | null) =>
    studioAnnotateUiActions.setAnalysisRequestId(setUi, requestId);
  const setAnalysisProgress = (progress: AnalysisProgress | null) =>
    studioAnnotateUiActions.setAnalysisProgress(setUi, progress);
  const setAnalysisResultFiles = (files: StudioAnalysisCsvFile[]) =>
    studioAnnotateUiActions.setAnalysisResultFiles(setUi, files);
  const setStatus = (status: string | null) => studioAnnotateUiActions.setStatus(setUi, status);

  const analysisInFlight = (): boolean => {
    if (studioAnalysisRunActive()) return true;
    const progress = getUi().analysisProgress;
    return progress != null && (progress.status === "queued" || progress.status === "running");
  };

  const goToNextSite = () => {
    const current = session.getState();
    const target = nextStudioAnnotateRoi(current.scan, current.selection);
    if (!target) return;
    current.changeSelection(() => current.setSelection(target));
  };

  const goToPreviousSite = () => {
    const current = session.getState();
    const target = previousStudioAnnotateRoi(current.scan, current.selection);
    if (!target) return;
    current.changeSelection(() => current.setSelection(target));
  };

  const startAnalysis = () => {
    const current = session.getState();
    const workspacePath = current.workspacePath;
    if (!workspacePath || analysisInFlight()) return;
    const token = claimStudioAnalysisRun();
    if (token == null) return;
    const wizard = getWizard();
    const assayJson = buildStudioAssayJsonFromWizard(wizard);
    const savedSnapshot = serializeBasicInfoSnapshot(wizard);
    const scheduled = scheduleStudioAnalysis({
      navigate: () => options.onNavigate("/analysis"),
      start: () => {
        setAnalysisStartConfirm(false);
        openStudioTaskCenter("analysis");
        void runStudioAnalysis({
          token,
          workspacePath,
          assayJson,
          saveAssayJson: async (path, body) => {
            await runClientEffect(studioClient.saveAssayJson(path, body));
          },
          startAnalysis: (input) => runStartAnalysis(input),
          subscribe: (requestId, onProgress) =>
            studioClient.onAnalysisProgress(requestId, onProgress),
          setAnalysisProgress,
          setAnalysisRequestId,
          setAnalysisResultFiles,
          setStatus,
          markAssaySaved: () => studioStoreActions.setBasicInfoSavedSnapshot(savedSnapshot),
          toErrorMessage,
          onCompleted: () => options.onNavigate("/analysis"),
        });
      },
      onNavigateError: (cause) => {
        const message = toErrorMessage(cause, "Could not open Analysis");
        logClientEvent(`analysis navigate failed ${message}`);
        setStatus(message);
      },
    });
    if (!scheduled) releaseStudioAnalysisRun(token);
  };

  const requestContinueToAnalysis = () => {
    const current = session.getState();
    if (!current.workspacePath || analysisInFlight()) return;
    if (current.annotation.dirty) {
      const proceed = window.confirm("You have unsaved annotation changes. Analyze anyway?");
      if (!proceed) return;
    }
    startAnalysis();
  };

  const syncDirtyFlag = () => {
    setStudioAnnotateDirty(session.getState().annotation.dirty);
  };

  syncDirtyFlag();

  const unsubscribeSession = session.subscribe(() => {
    syncDirtyFlag();
    notify();
  });

  const unsubscribeWizard = registry.subscribe(studioWizardAtom, () => {
    syncWorkspaceToUi();
    session.syncExternal();
    syncDirtyFlag();
    notify();
  });

  const unsubscribeUi = registry.subscribe(studioAnnotateUiAtom, () => {
    syncDirtyFlag();
    notify();
  });

  const getState = (): StudioAnnotateState => {
    const current = session.getState();
    const ui = getUi();
    return {
      ...current,
      analysisStartConfirm: ui.analysisStartConfirm,
      analysisRequestId: ui.analysisRequestId,
      analysisProgress: ui.analysisProgress,
      analysisResultFiles: ui.analysisResultFiles,
      setAnalysisProgress,
      setAnalysisResultFiles,
      setAnalysisStartConfirm,
      startAnalysis,
      canGoToNextSite: nextStudioAnnotateRoi(current.scan, current.selection) !== null,
      goToNextSite,
      canGoToPreviousSite: previousStudioAnnotateRoi(current.scan, current.selection) !== null,
      goToPreviousSite,
      requestContinueToAnalysis,
      workspaceMissing: !activeWorkspacePath(),
    };
  };

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncExternal() {
      syncWorkspaceToUi();
      session.syncExternal();
      syncDirtyFlag();
      notify();
    },
    dispose() {
      disposed = true;
      setStudioAnnotateDirty(false);
      unsubscribeSession();
      unsubscribeWizard();
      unsubscribeUi();
      session.dispose();
      listeners.clear();
    },
  };
}
