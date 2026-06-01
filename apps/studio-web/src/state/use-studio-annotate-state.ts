import type {
  AnalysisProgress,
  ContrastWindow,
  FrameResult,
  StudioAnalysisCsvFile,
  RoiFrameRequest,
  RoiPositionScan,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import { resultData, resultFailureMessage, resultLoading } from "@lisca/client/atoms";
import { useCanvasResourceTransaction, useCanvasTransientStatus } from "@lisca/ui";
import { clamp } from "@lisca/utils";
import { useAtomValue } from "@effect-atom/atom-react";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";

import { runClientEffect } from "@lisca/client/runtime";
import { toErrorMessage } from "../api/studio-client";
import { studioClient } from "../api/studio-port";
import { roiScanIdleAtom, roiWorkspaceScanAtom } from "../atoms/studio-query-atoms";
import {
  annotateRequestKey,
  currentAnnotatePosition,
  currentAnnotateRoi,
  useStudioAnnotateStore,
} from "./studio-annotate-store";
import {
  buildStudioAssayJson,
  serializeBasicInfoSnapshot,
  useStudioStore,
} from "./studio-store";
import { validateAssayForAnalysis } from "../utils/studio-assay-validation";

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
  setContrast: (contrast: ContrastWindow) => void;
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
    setWorkspacePath,
    setSelection,
    setFrame,
    setContrast,
    setContrastState,
    setFrameLoading,
    setScanError,
    setFrameError,
    setStatus,
    setAnalysisStartConfirm,
    setAnalysisRequestId,
    setAnalysisProgress,
    setAnalysisResultFiles,
  } = useStudioAnnotateStore();
  const scanResult = useAtomValue(
    activeWorkspacePath ? roiWorkspaceScanAtom(activeWorkspacePath) : roiScanIdleAtom,
  );
  const scan = resultData(scanResult) ?? null;
  const scanLoading = Boolean(activeWorkspacePath && resultLoading(scanResult));
  const loadCanvasResources = useCanvasResourceTransaction();
  const position = useMemo(
    () => currentAnnotatePosition(scan, selection.pos),
    [scan, selection.pos],
  );
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
  const activeRequestKey = annotateRequestKey(position, selectedRoi, selection);
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
    setWorkspacePath(activeWorkspacePath);
  }, [activeWorkspacePath, setWorkspacePath]);

  useEffect(() => {
    if (resultLoading(scanResult)) {
      setScanError(null);
      setStatus("Scanning ROI workspace");
    }
  }, [scanResult, setScanError, setStatus]);

  useEffect(() => {
    if (!scan || workspacePath !== activeWorkspacePath) return;
    setStatus("ROI workspace loaded");
  }, [activeWorkspacePath, scan, setStatus, workspacePath]);

  useEffect(() => {
    const scanLoadError = resultFailureMessage(scanResult);
    if (!scanLoadError) return;
    setFrame(null);
    setScanError(toErrorMessage(scanLoadError, "ROI workspace load failed"));
  }, [scanResult, setFrame, setScanError]);

  useEffect(() => {
    const firstPosition = scan?.positions[0] ?? null;
    if (!firstPosition) {
      setSelection({ pos: null, roi: null, channel: null, timeIndex: 0, zIndex: 0 });
      return;
    }
    if (!scan?.positions.some((entry) => entry.pos === selection.pos)) {
      setSelection({ pos: firstPosition.pos, roi: null, timeIndex: 0, zIndex: 0 });
    }
  }, [scan, selection.pos, setSelection]);

  useEffect(() => {
    if (!position) return;
    const patch = {
      channel: position.channels.includes(selection.channel ?? Number.NaN)
        ? selection.channel
        : (position.channels[0] ?? null),
      roi: position.rois.some((entry) => entry.roi === selection.roi)
        ? selection.roi
        : (position.rois[0]?.roi ?? null),
      timeIndex: clamp(selection.timeIndex, 0, Math.max(0, position.times.length - 1)),
      zIndex: clamp(selection.zIndex, 0, Math.max(0, position.zSlices.length - 1)),
    };
    if (
      patch.channel !== selection.channel ||
      patch.roi !== selection.roi ||
      patch.timeIndex !== selection.timeIndex ||
      patch.zIndex !== selection.zIndex
    ) {
      setSelection(patch);
    }
  }, [position, selection, setSelection]);

  useEffect(() => {
    if (!workspacePath || workspacePath !== activeWorkspacePath || !request) {
      setFrameLoading(false);
      return;
    }

    return loadCanvasResources({
      start: () => {
        setFrameLoading(true);
        setFrameError(null);
        setStatus("Loading ROI frame");
      },
      load: (signal) => studioClient.loadRoiFrame(workspacePath, request, null, signal),
      commit: (nextFrame) => {
        setFrame(nextFrame);
        setContrastState(nextFrame);
      },
      reject: (cause) => {
        if (isAbortError(cause)) return;
        setFrame(null);
        setFrameError(toErrorMessage(cause, "ROI frame load failed"));
      },
      settle: () => setFrameLoading(false),
    });
  }, [
    activeRequestKey,
    activeWorkspacePath,
    loadCanvasResources,
    request,
    setContrastState,
    setFrame,
    setFrameError,
    setFrameLoading,
    setStatus,
    workspacePath,
  ]);

  const changeSelection = useCallback(
    (patch: Partial<StudioAnnotateState["selection"]>) => setSelection(patch),
    [setSelection],
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
    setSelection({
      pos: randomPosition.pos,
      roi,
      channel,
      timeIndex,
      zIndex,
    });
  }, [scan?.positions, setSelection]);

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
        void navigate({ to: "/result" });
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

  return {
    workspacePath,
    scan,
    analysisStartConfirm,
    analysisRequestId,
    analysisProgress,
    analysisResultFiles,
    position,
    request,
    frame,
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
  };
}
