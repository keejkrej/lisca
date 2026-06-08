import type {
  AnalysisProgress,
  ContrastWindow,
  FrameResult,
  StudioAnalysisCsvFile,
  RoiFrameRequest,
  RoiPositionScan,
  RoiWorkspaceScan,
  AnnotationLabel,
} from "@lisca/contracts";
import { useAnnotateSessionCore } from "@lisca/client/annotate-session/react";
import { requestKey } from "@lisca/client/atoms/annotator-ui";
import {
  createStudioAnnotateSessionActions,
  createStudioAnnotateSetUi,
  studioAnnotateToAnnotatorUi,
  type StudioAnnotateSessionActions,
} from "@lisca/client/studio-annotate-session-bridge";
import { useCanvasResourceTransaction, useCanvasTransientStatus } from "@lisca/ui/features";
import { Atom, Result, useAtom, useAtomValue } from "@effect-atom/atom-react";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";

import { runClientEffect } from "@lisca/client/runtime";
import { studioNavigate } from "../navigation/use-studio-navigate";
import { studioClient, toErrorMessage } from "../api/studio-port";
import { roiScanIdleAtom, roiWorkspaceScanAtom } from "../atoms/studio-query-atoms";
import {
  currentAnnotateRoi,
  studioAnnotateUiActions,
  studioAnnotateUiAtom,
  useStudioAnnotateStore,
} from "./studio-annotate-store";
import {
  buildStudioAssayJson,
  serializeBasicInfoSnapshot,
  useStudioStore,
} from "./studio-store";
import { validateAssayForAnalysis } from "../utils/studio-assay-validation";

const labelsIdleAtom = Atom.make(Result.initial<AnnotationLabel[]>());

function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === "AbortError";
}

function makeRoiFrameRequest(
  position: RoiPositionScan | null,
  roi: number | null,
  channel: number | null,
  timeIndex: number,
  zIndex: number,
): RoiFrameRequest | null {
  const roiEntry = currentAnnotateRoi(position, roi);
  if (!position || !roiEntry || channel == null) return null;
  const time = position.times[timeIndex];
  const z = position.zSlices[zIndex];
  if (time == null || z == null) return null;
  return {
    pos: position.pos,
    roi: roiEntry.roi,
    channel,
    time,
    z,
  };
}

export type StudioAnnotateState = {
  workspacePath: string | null;
  scan: RoiWorkspaceScan | null;
  position: RoiPositionScan | null;
  analysisStartConfirm: boolean;
  analysisRequestId: string | null;
  analysisProgress: AnalysisProgress | null;
  analysisResultFiles: StudioAnalysisCsvFile[];
  request: RoiFrameRequest | null;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
  scanLoading: boolean;
  frameLoading: boolean;
  error: string | null;
  toasts: { text: string; tone?: "error" | "success" | "default" }[];
  selection: {
    pos: number | null;
    roi: number | null;
    channel: number | null;
    timeIndex: number;
    zIndex: number;
  };
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setAnalysisResultFiles: (files: StudioAnalysisCsvFile[]) => void;
  setSelection: (patch: Partial<StudioAnnotateState["selection"]>) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  startAnalysis: () => void;
  setAnalysisStartConfirm: (value: boolean) => void;
  shuffleSelection: () => void;
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
  const navigate = useNavigate();
  const {
    workspacePath,
    selection,
    frame,
    contrast,
    contrastDomain,
    contrastMin,
    contrastMax,
    frameLoading,
    scanError,
    frameError,
    status,
    analysisStartConfirm,
    analysisRequestId,
    analysisProgress,
    analysisResultFiles,
    setContrast,
    setContrastState,
    setFrameLoading,
    setFrameError,
    setStatus,
    setAnalysisStartConfirm,
    setAnalysisRequestId,
    setAnalysisProgress,
    setAnalysisResultFiles,
  } = useStudioAnnotateStore();

  const [ui, setUi] = useAtom(studioAnnotateUiAtom);
  const annotatorUi = useMemo(() => studioAnnotateToAnnotatorUi(ui), [ui]);
  const setAnnotatorUi = useMemo(() => createStudioAnnotateSetUi(setUi), [setUi]);
  const sessionActions = useMemo(
    () => createStudioAnnotateSessionActions(studioAnnotateUiActions as StudioAnnotateSessionActions),
    [],
  );
  const scanResult = useAtomValue(
    activeWorkspacePath ? roiWorkspaceScanAtom(activeWorkspacePath) : roiScanIdleAtom,
  );
  const labelsIdleResult = useAtomValue(labelsIdleAtom);

  const session = useAnnotateSessionCore({
    ui: annotatorUi,
    setUi: setAnnotatorUi,
    actions: sessionActions,
    workspace: {
      workspacePath: activeWorkspacePath,
      setWorkspacePath: (path) => studioAnnotateUiActions.setWorkspacePath(setUi, path),
    },
    scan: {
      scanResult,
      labelsResult: labelsIdleResult,
      shellWorkspacePath: activeWorkspacePath,
    },
    toErrorMessage,
  });

  const { scan, position } = session.derived;
  const { scanLoading } = session.meta;

  const selectedRoi = useMemo(
    () => currentAnnotateRoi(position, selection.roi),
    [position, selection.roi],
  );
  const request = useMemo(
    () =>
      makeRoiFrameRequest(
        position,
        selectedRoi?.roi ?? null,
        selection.channel,
        selection.timeIndex,
        selection.zIndex,
      ),
    [position, selectedRoi?.roi, selection.channel, selection.timeIndex, selection.zIndex],
  );
  const activeRequestKey = requestKey(position, selectedRoi, selection);
  const loadCanvasResources = useCanvasResourceTransaction();
  const visibleStatus = useCanvasTransientStatus(status);
  const activeStatus = frameLoading
    ? "Loading ROI frame"
    : scanLoading
      ? "Scanning ROI workspace"
      : visibleStatus;
  const error = scanError ?? frameError;
  const toasts = useMemo(() => {
    if (error) return [{ text: error, tone: "error" as const }];
    if (activeStatus) return [{ text: activeStatus }];
    return [];
  }, [activeStatus, error]);

  useEffect(() => {
    if (!workspacePath || workspacePath !== activeWorkspacePath || !request) {
      setFrameLoading(false);
      return;
    }

    return loadCanvasResources({
      start: () => {
        setContrast(null);
        setFrameLoading(true);
        setFrameError(null);
        setStatus("Loading ROI frame");
      },
      load: (signal) =>
        runClientEffect(studioClient.loadRoiFrame(workspacePath, request, null, signal), { signal }),
      commit: (nextFrame) => {
        studioAnnotateUiActions.setFrame(setUi, nextFrame);
        setContrastState(nextFrame);
      },
      reject: (cause) => {
        if (isAbortError(cause)) return;
        studioAnnotateUiActions.setFrame(setUi, null);
        setFrameError(toErrorMessage(cause, "ROI frame load failed"));
      },
      settle: () => setFrameLoading(false),
    });
  }, [
    activeRequestKey,
    activeWorkspacePath,
    loadCanvasResources,
    request,
    setContrast,
    setContrastState,
    setFrameError,
    setFrameLoading,
    setStatus,
    setUi,
    workspacePath,
  ]);

  useEffect(() => {
    if (!contrast || !workspacePath || workspacePath !== activeWorkspacePath || !request) {
      return;
    }

    return loadCanvasResources({
      start: () => {
        setFrameLoading(true);
        setFrameError(null);
      },
      load: (signal) =>
        runClientEffect(
          studioClient.loadRoiFrame(workspacePath, request, contrast, signal),
          { signal },
        ),
      commit: (nextFrame) => {
        studioAnnotateUiActions.setFrame(setUi, nextFrame);
        setContrastState(nextFrame);
      },
      reject: (cause) => {
        if (isAbortError(cause)) return;
        setFrameError(toErrorMessage(cause, "ROI frame contrast update failed"));
      },
      settle: () => setFrameLoading(false),
    });
  }, [
    activeWorkspacePath,
    contrast,
    loadCanvasResources,
    request,
    setContrastState,
    setFrameError,
    setFrameLoading,
    setUi,
    workspacePath,
  ]);

  const changeSelection = useCallback(
    (patch: Partial<StudioAnnotateState["selection"]>) =>
      studioAnnotateUiActions.setSelection(setUi, patch),
    [setUi],
  );

  const shuffleSelection = useCallback(() => {
    if (!scan?.positions.length) return;
    const randomPosition = scan.positions[Math.floor(Math.random() * scan.positions.length)];
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
    studioAnnotateUiActions.setSelection(setUi, {
      pos: randomPosition.pos,
      roi,
      channel,
      timeIndex,
      zIndex,
    });
  }, [scan?.positions, setUi]);

  const startAnalysis = useCallback(() => {
    if (!workspacePath) return;
    const validation = validateAssayForAnalysis({ assayId, info1, info2, info3 });
    if (!validation.ok || !assayId) {
      setStatus(validation.ok ? "Assay type is missing" : validation.errors[0] ?? "Invalid assay");
      return;
    }

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
        const assayJson = buildStudioAssayJson({
          assayId,
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
  }, [
    assayId,
    dataSourceKind,
    info1,
    info2,
    info3,
    navigate,
    setAnalysisProgress,
    setAnalysisRequestId,
    setAnalysisResultFiles,
    setAnalysisStartConfirm,
    setBasicInfoSavedSnapshot,
    setStatus,
    workspacePath,
  ]);

  return useMemo(
    () => ({
      workspacePath,
      scan,
      analysisStartConfirm,
      analysisRequestId,
      analysisProgress,
      analysisResultFiles,
      position,
      request,
      frame,
      contrast,
      contrastDomain,
      contrastMin,
      contrastMax,
      scanLoading,
      frameLoading,
      error,
      toasts,
      selection,
      setAnalysisProgress,
      setAnalysisResultFiles,
      setSelection: changeSelection,
      setAnalysisStartConfirm,
      startAnalysis,
      setContrast,
      shuffleSelection,
    }),
    [
      analysisProgress,
      analysisRequestId,
      analysisResultFiles,
      analysisStartConfirm,
      changeSelection,
      contrast,
      contrastDomain,
      contrastMax,
      contrastMin,
      error,
      frame,
      frameLoading,
      position,
      request,
      scan,
      scanLoading,
      selection,
      setAnalysisProgress,
      setAnalysisResultFiles,
      setAnalysisStartConfirm,
      setContrast,
      shuffleSelection,
      startAnalysis,
      toasts,
      workspacePath,
    ],
  );
}
