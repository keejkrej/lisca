import type { AnalysisProgress, StudioAnalysisCsvFile } from "@lisca/contracts";
import { ASSAY_TYPE } from "@lisca/contracts/assay";
import { useAnnotateStateCore } from "@lisca/client/use-annotate-state-core";
import {
  currentRoi,
  requestKey,
  roiRequestSelectionKey,
  type AnnotatorUiActions,
  type AnnotatorUiAtom,
} from "@lisca/client/atoms/annotator-ui";
import { useCanvasResourceTransaction, useCanvasTransientStatus } from "@lisca/ui-native";
import { useAtom } from "@effect-atom/atom-react";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { runClientEffect } from "@lisca/client/runtime";

import { studioClient, toErrorMessage } from "../api/studio-port";
import {
  annotationLabelsAtom,
  labelsIdleAtom,
  roiScanIdleAtom,
  roiWorkspaceScanAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} from "../atoms/studio-query-atoms";
import {
  effectErrorMessage,
  loadRoiFrameEffect,
  loadRoiFrameWithAnnotationEffect,
} from "../effects/roi-loader";
import { studioAnnotateUiActions, studioAnnotateUiAtom } from "./studio-annotate-store";
import { setStudioAnnotateDirty } from "./studio-annotate-guard";
import { buildStudioAssayJson, serializeBasicInfoSnapshot, useStudioStore } from "./studio-store";
import { emptyValueFor, useAnnotationHistory } from "./use-annotation-history";
import { encodeMaskToBase64Png, maskHasPixels } from "../utils/annotation-utils";
import { makeRequest } from "../utils/roi-request";

function useStudioWorkspaceSync(activeWorkspacePath: string | null) {
  const [ui, setUi] = useAtom(studioAnnotateUiAtom);
  useEffect(() => {
    if (ui.workspacePath !== activeWorkspacePath) {
      studioAnnotateUiActions.setWorkspacePath(setUi, activeWorkspacePath);
    }
  }, [activeWorkspacePath, setUi, ui.workspacePath]);
  return {
    workspacePath: activeWorkspacePath,
    setWorkspacePath: (path: string | null) =>
      studioAnnotateUiActions.setWorkspacePath(setUi, path),
  };
}

export type StudioAnnotateState = ReturnType<typeof useAnnotateStateCore> & {
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
  const saveTo = useStudioStore((state) => state.info1.saveTo);
  const assayId = useStudioStore((state) => state.assayId);
  const dataSourceKind = useStudioStore((state) => state.dataSourceKind);
  const info1 = useStudioStore((state) => state.info1);
  const info2 = useStudioStore((state) => state.info2);
  const info3 = useStudioStore((state) => state.info3);
  const setBasicInfoSavedSnapshot = useStudioStore((state) => state.setBasicInfoSavedSnapshot);
  const activeWorkspacePath = saveTo.trim() || null;
  const router = useRouter();
  const [ui, setUi] = useAtom(studioAnnotateUiAtom);
  const {
    analysisStartConfirm,
    analysisRequestId,
    analysisProgress,
    analysisResultFiles,
  } = ui;
  const workspace = useStudioWorkspaceSync(activeWorkspacePath);
  const annotate = useAnnotateStateCore({
    annotatorClient: studioClient,
    toErrorMessage,
    effectErrorMessage,
    loadRoiFrameWithAnnotationEffect,
    loadRoiFrameEffect,
    annotatorUiAtom: studioAnnotateUiAtom as unknown as AnnotatorUiAtom,
    annotatorUiActions: studioAnnotateUiActions as unknown as AnnotatorUiActions,
    roiWorkspaceScanAtom,
    roiScanIdleAtom,
    annotationLabelsAtom,
    labelsIdleAtom,
    saveAnnotationLabelsAtom,
    saveRoiFrameAnnotationAtom,
    useShellWorkspace: () => workspace,
    useCanvasResourceTransaction,
    useCanvasTransientStatus,
    guardDirtySelection: () => true,
    useAnnotationHistory,
    emptyValueFor,
    makeRequest,
    currentRoi,
    requestKey,
    roiRequestSelectionKey,
    encodeMaskToBase64Png,
    maskHasPixels,
  });
  useEffect(() => {
    setStudioAnnotateDirty(annotate.annotation.dirty);
  }, [annotate.annotation.dirty]);
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
    if (!annotate.scan?.positions.length) return;
    const randomPosition = annotate.scan.positions[Math.floor(Math.random() * annotate.scan.positions.length)];
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
    annotate.changeSelection(() =>
      annotate.setSelection({
        pos: randomPosition.pos,
        roi,
        channel,
        timeIndex,
        zIndex,
      }),
    );
  };
  const startAnalysis = () => {
    const workspacePath = annotate.workspacePath;
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
        router.push("/result");
      }
      if (progress.status === "error") {
        stop?.();
        stop = null;
        setStatus(progress.error ?? "Analysis failed");
      }
    };
    void (async () => {
      try {
        const assayJson = buildStudioAssayJson({
          assayId: assayId ?? ASSAY_TYPE.CUSTOM_ASSAY,
          dataSourceKind,
          info1,
          info2,
          info3,
        });
        await runClientEffect(
          studioClient.saveAssayJson(workspacePath, JSON.stringify(assayJson, null, 2)),
        );
        setBasicInfoSavedSnapshot(
          serializeBasicInfoSnapshot({
            assayId,
            dataSourceKind,
            info1,
            info2,
            info3,
          }),
        );
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
    if (annotate.annotation.dirty) {
      Alert.alert(
        "Unsaved changes",
        "You have unsaved annotation changes. Continue to analysis anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => setAnalysisStartConfirm(true) },
        ],
      );
      return;
    }
    setAnalysisStartConfirm(true);
  };
  return {
    ...annotate,
    analysisStartConfirm,
    analysisRequestId,
    analysisProgress,
    analysisResultFiles,
    setAnalysisProgress,
    setAnalysisResultFiles,
    setAnalysisStartConfirm,
    startAnalysis,
    shuffleSelection,
    requestContinueToAnalysis,
    workspaceMissing: !activeWorkspacePath,
  };
}
