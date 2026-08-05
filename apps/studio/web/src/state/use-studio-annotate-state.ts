import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { useAnnotateStateCore } from "@lisca/client/use-annotate-state-core";
import { useCanvasResourceTransaction, useCanvasTransientStatus } from "@lisca/ui/features";
import { useAtom } from "@effect-atom/atom-solid";
import { createEffect } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { runClientEffect } from "@lisca/client/runtime";

import { studioNavigate } from "../navigation/use-studio-navigate";
import { studioClient, toErrorMessage } from "../api/studio-port";
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

function useStudioWorkspaceSync(activeWorkspacePath: () => string | null) {
  const [ui, setUi] = useAtom(studioAnnotateUiAtom);
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
  shuffleSelection: () => void;
  requestContinueToAnalysis: () => void;
  workspaceMissing: boolean;
};

export function useStudioAnnotateState(): StudioAnnotateState {
  const wizard = useStudioStore();
  const setBasicInfoSavedSnapshot = useStudioStore((state) => state.setBasicInfoSavedSnapshot);
  const activeWorkspacePath = () => wizard().workspacePath.trim() || null;
  const navigate = useNavigate();
  const [ui, setUi] = useAtom(studioAnnotateUiAtom);
  const workspace = useStudioWorkspaceSync(activeWorkspacePath);
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
  const shuffleSelection = () => {
    const current = annotate();
    if (!current.scan?.positions.length) return;
    const randomPosition =
      current.scan.positions[Math.floor(Math.random() * current.scan.positions.length)];
    const randomRoi =
      randomPosition?.rois[Math.floor(Math.random() * randomPosition.rois.length)] ?? null;
    const channel = randomPosition ? (randomPosition.channels[0] ?? null) : null;
    const roi = randomRoi?.roi ?? null;
    const timeIndex =
      randomPosition && randomPosition.times.length > 0
        ? Math.floor(Math.random() * randomPosition.times.length)
        : 0;
    const zIndex =
      randomPosition && randomPosition.zSlices.length > 0
        ? Math.floor(Math.random() * randomPosition.zSlices.length)
        : 0;
    if (!randomPosition) return;
    current.changeSelection(() =>
      current.setSelection({
        pos: randomPosition.pos,
        roi,
        channel,
        timeIndex,
        zIndex,
      }),
    );
  };
  const startAnalysis = () => {
    const current = annotate();
    const workspacePath = current.workspacePath;
    if (!workspacePath) return;
    setAnalysisStartConfirm(false);
    setStatus("Saving assay.json");
    const requestId = `studio-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setAnalysisRequestId(requestId);
    setAnalysisResultFiles([]);
    setAnalysisProgress({
      requestId,
      status: "queued",
      stage: "queued",
      progress: 0,
      message: "Saving assay.json",
      resultFiles: [],
      error: null,
    });
    let stop: (() => void) | null = null;
    const onProgress = (progress: AnalysisProgress) => {
      setAnalysisProgress(progress);
      if (progress.resultFiles?.length) {
        setAnalysisResultFiles(progress.resultFiles);
      }
      if (progress.status === "completed") {
        stop?.();
        stop = null;
        setStatus("Analysis completed");
        studioNavigate(navigate, "/result");
      }
      if (progress.status === "error") {
        stop?.();
        stop = null;
        setStatus(progress.error ?? "Analysis failed");
      }
    };
    void (async () => {
      try {
        const assayJson = buildStudioAssayJsonFromWizard(wizard());
        await runClientEffect(
          studioClient.saveAssayJson(workspacePath, JSON.stringify(assayJson, null, 2)),
        );
        setBasicInfoSavedSnapshot()(serializeBasicInfoSnapshot(wizard()));
        setStatus("Starting analysis");
        setAnalysisProgress({
          requestId,
          status: "queued",
          stage: "queued",
          progress: 0,
          message: "Queued analysis",
          resultFiles: [],
          error: null,
        });
        const initialProgress = await runClientEffect(
          studioClient.startAnalysis({
            workspacePath,
            requestId,
          }),
        );
        setAnalysisProgress(initialProgress);
        stop = studioClient.onAnalysisProgress(requestId, onProgress);
      } catch (cause) {
        stop?.();
        stop = null;
        setAnalysisProgress({
          requestId,
          status: "error",
          stage: "queued",
          progress: 0,
          message: "Analysis failed to start",
          resultFiles: [],
          error: toErrorMessage(cause, "Analysis failed"),
        });
        setStatus(toErrorMessage(cause, "Analysis failed"));
      }
    })();
  };
  const requestContinueToAnalysis = () => {
    const current = annotate();
    if (current.annotation.dirty) {
      const proceed = window.confirm(
        "You have unsaved annotation changes. Continue to analysis anyway?",
      );
      if (!proceed) return;
    }
    setAnalysisStartConfirm(true);
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
    shuffleSelection,
    requestContinueToAnalysis,
    get workspaceMissing() {
      return !activeWorkspacePath();
    },
  };
}
