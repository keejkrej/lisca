import type { AnalysisProgress, AnalysisStartRequest, StudioAnalysisCsvFile } from "@lisca/contracts";
import { useAnnotateStateCore } from "@lisca/client/use-annotate-state-core";
import { logClientEvent } from "@lisca/client/client-log";
import { useCanvasResourceTransaction, useCanvasTransientStatus } from "@lisca/ui/features";
import { useAtom } from "@effect/atom-solid";
import { Effect } from "effect";
import { createEffect } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { runClientEffect } from "@lisca/client/runtime";

import { studioClient, toErrorMessage } from "../api/studio-port";
import { openStudioTaskCenter } from "../components/studio-task-center-open";
import { studioNavigate } from "../navigation/use-studio-navigate";
import {
  annotationLabelsAtom,
  labelsIdleAtom,
  roiScanIdleAtom,
  roiWorkspaceScanAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} from "../atoms/studio-query-atoms";
import { studioAnnotateUiActions, studioAnnotateUiAtom } from "./studio-annotate-store";
import {
  buildStudioAssayJsonFromWizard,
  serializeBasicInfoSnapshot,
  useStudioStore,
} from "./studio-store";
import { setStudioAnnotateDirty } from "./studio-annotate-guard";
import { nextStudioAnnotateRoi, previousStudioAnnotateRoi } from "./studio-annotate-navigation";
import {
  claimStudioAnalysisRun,
  releaseStudioAnalysisRun,
  runStudioAnalysis,
  scheduleStudioAnalysis,
  studioAnalysisRunActive,
} from "./studio-analysis-run";

function useStudioWorkspaceSync(activeWorkspacePath: () => string | null) {
  const [ui, setUi] = useAtom(() => studioAnnotateUiAtom);
  createEffect(() => {
    const path = activeWorkspacePath();
    if (ui().workspacePath !== path) {
      studioAnnotateUiActions.setWorkspacePath(setUi, path);
    }
  });
  return {
    get workspacePath() {
      return activeWorkspacePath();
    },
    setWorkspacePath: (path: string | null) =>
      studioAnnotateUiActions.setWorkspacePath(setUi, path),
  };
}

export type StudioAnnotateState = ReturnType<ReturnType<typeof useAnnotateStateCore>> & {
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

export function useStudioAnnotateState(): StudioAnnotateState {
  const wizard = useStudioStore();
  const setBasicInfoSavedSnapshot = useStudioStore((state) => state.setBasicInfoSavedSnapshot);
  const activeWorkspacePath = () => wizard().workspacePath.trim() || null;
  const navigate = useNavigate();
  const [ui, setUi] = useAtom(() => studioAnnotateUiAtom);
  const workspace = useStudioWorkspaceSync(activeWorkspacePath);
  const runStartAnalysis = (input: AnalysisStartRequest) =>
    Effect.runPromise(studioClient.startAnalysis(input));
  const annotate = useAnnotateStateCore({
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
    useShellWorkspace: () => workspace,
    useCanvasResourceTransaction,
    useCanvasTransientStatus: (status) => useCanvasTransientStatus(status),
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
  const analysisInFlight = () => {
    if (studioAnalysisRunActive()) return true;
    const progress = ui().analysisProgress;
    return progress != null && (progress.status === "queued" || progress.status === "running");
  };
  const nextSite = () => {
    const current = annotate();
    return nextStudioAnnotateRoi(current.scan, current.selection);
  };
  const goToNextSite = () => {
    const current = annotate();
    const target = nextStudioAnnotateRoi(current.scan, current.selection);
    if (!target) return;
    current.changeSelection(() => current.setSelection(target));
  };
  const previousSite = () => {
    const current = annotate();
    return previousStudioAnnotateRoi(current.scan, current.selection);
  };
  const goToPreviousSite = () => {
    const current = annotate();
    const target = previousStudioAnnotateRoi(current.scan, current.selection);
    if (!target) return;
    current.changeSelection(() => current.setSelection(target));
  };
  const startAnalysis = () => {
    const current = annotate();
    const workspacePath = current.workspacePath;
    if (!workspacePath || analysisInFlight()) return;
    const token = claimStudioAnalysisRun();
    if (token == null) return;
    const assayJson = buildStudioAssayJsonFromWizard(wizard());
    const savedSnapshot = serializeBasicInfoSnapshot(wizard());
    const markSaved = setBasicInfoSavedSnapshot();
    const scheduled = scheduleStudioAnalysis({
      navigate: () => navigate({ to: "/analysis" }),
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
          markAssaySaved: () => markSaved(savedSnapshot),
          toErrorMessage,
          onCompleted: () => studioNavigate(navigate, "/analysis"),
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
    const current = annotate();
    if (!current.workspacePath || analysisInFlight()) return;
    if (current.annotation.dirty) {
      const proceed = window.confirm("You have unsaved annotation changes. Analyze anyway?");
      if (!proceed) return;
    }
    startAnalysis();
  };
  createEffect(() => {
    setStudioAnnotateDirty(annotate().annotation.dirty);
  });
  return {
    get workspacePath() {
      return annotate().workspacePath;
    },
    get scan() {
      return annotate().scan;
    },
    get labels() {
      return annotate().labels;
    },
    get selection() {
      return annotate().selection;
    },
    get activeLabelId() {
      return annotate().activeLabelId;
    },
    get mode() {
      return annotate().mode;
    },
    get tool() {
      return annotate().tool;
    },
    get brushSize() {
      return annotate().brushSize;
    },
    get overlayOpacity() {
      return annotate().overlayOpacity;
    },
    get frame() {
      return annotate().frame;
    },
    get contrast() {
      return annotate().contrast;
    },
    get contrastDomain() {
      return annotate().contrastDomain;
    },
    get contrastMin() {
      return annotate().contrastMin;
    },
    get contrastMax() {
      return annotate().contrastMax;
    },
    get scanLoading() {
      return annotate().scanLoading;
    },
    get frameLoading() {
      return annotate().frameLoading;
    },
    get annotationLoading() {
      return annotate().annotationLoading;
    },
    get saving() {
      return annotate().saving;
    },
    get scanError() {
      return annotate().scanError;
    },
    get frameError() {
      return annotate().frameError;
    },
    get annotationError() {
      return annotate().annotationError;
    },
    get saveError() {
      return annotate().saveError;
    },
    get labelError() {
      return annotate().labelError;
    },
    get labelDialogOpen() {
      return annotate().labelDialogOpen;
    },
    get filePickerOpen() {
      return annotate().filePickerOpen;
    },
    get position() {
      return annotate().position;
    },
    get request() {
      return annotate().request;
    },
    get annotation() {
      return annotate().annotation;
    },
    get canEdit() {
      return annotate().canEdit;
    },
    get canEditSegmentation() {
      return annotate().canEditSegmentation;
    },
    get canSave() {
      return annotate().canSave;
    },
    get canvasToasts() {
      return annotate().canvasToasts;
    },
    get setFilePickerOpen() {
      return annotate().setFilePickerOpen;
    },
    get setLabelDialogOpen() {
      return annotate().setLabelDialogOpen;
    },
    get setLabelError() {
      return annotate().setLabelError;
    },
    get setSelection() {
      return annotate().setSelection;
    },
    get setContrast() {
      return annotate().setContrast;
    },
    get setMode() {
      return annotate().setMode;
    },
    get setTool() {
      return annotate().setTool;
    },
    get setBrushSize() {
      return annotate().setBrushSize;
    },
    get setOverlayOpacity() {
      return annotate().setOverlayOpacity;
    },
    get setActiveLabelId() {
      return annotate().setActiveLabelId;
    },
    get changeSelection() {
      return annotate().changeSelection;
    },
    get handleSave() {
      return annotate().handleSave;
    },
    get handleSaveLabels() {
      return annotate().handleSaveLabels;
    },
    get saveLabelsPending() {
      return annotate().saveLabelsPending;
    },
    get pickWorkspace() {
      return annotate().pickWorkspace;
    },
    get analysisStartConfirm() {
      return ui().analysisStartConfirm;
    },
    get analysisRequestId() {
      return ui().analysisRequestId;
    },
    get analysisProgress() {
      return ui().analysisProgress;
    },
    get analysisResultFiles() {
      return ui().analysisResultFiles;
    },
    setAnalysisProgress,
    setAnalysisResultFiles,
    setAnalysisStartConfirm,
    startAnalysis,
    get canGoToNextSite() {
      return nextSite() !== null;
    },
    goToNextSite,
    get canGoToPreviousSite() {
      return previousSite() !== null;
    },
    goToPreviousSite,
    requestContinueToAnalysis,
    get workspaceMissing() {
      return !activeWorkspacePath();
    },
  };
}
