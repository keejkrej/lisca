import type {
  ContrastWindow,
  FrameResult,
  RoiFrameRequest,
  RoiPositionScan,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import { useCanvasResourceTransaction, useCanvasTransientStatus } from "@lisca/ui";
import { clamp } from "@lisca/utils";
import { useCallback, useEffect, useMemo } from "react";

import { studioClient, toErrorMessage } from "../api/studio-client";
import { useStudioRoiWorkspaceScanQuery } from "../api/studio-queries";
import {
  annotateRequestKey,
  currentAnnotatePosition,
  currentAnnotateRoi,
  useStudioAnnotateStore,
} from "./studio-annotate-store";
import { useStudioStore } from "./studio-store";

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
  setSelection: (patch: Partial<StudioAnnotateState["selection"]>) => void;
  setContrast: (contrast: ContrastWindow) => void;
  shuffleSelection: () => void;
};

export function useStudioAnnotateState(): StudioAnnotateState {
  const saveTo = useStudioStore((state) => state.info1.saveTo);
  const activeWorkspacePath = saveTo.trim() || null;
  const {
    workspacePath,
    scan,
    selection,
    frame,
    contrast,
    contrastDomain,
    contrastMin,
    contrastMax,
    scanLoading,
    frameLoading,
    scanError,
    frameError,
    status,
    setWorkspacePath,
    setScan,
    setSelection,
    setFrame,
    setContrast,
    setContrastState,
    setScanLoading,
    setFrameLoading,
    setScanError,
    setFrameError,
    setStatus,
  } = useStudioAnnotateStore();
  const scanQuery = useStudioRoiWorkspaceScanQuery(activeWorkspacePath);
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
    setScanLoading(Boolean(activeWorkspacePath && scanQuery.isFetching));
    if (scanQuery.isFetching) {
      setScanError(null);
      setStatus("Scanning ROI workspace");
    }
  }, [activeWorkspacePath, scanQuery.isFetching, setScanError, setScanLoading, setStatus]);

  useEffect(() => {
    if (!scanQuery.data || workspacePath !== activeWorkspacePath) return;
    setScan(scanQuery.data);
    setStatus("ROI workspace loaded");
  }, [activeWorkspacePath, scanQuery.data, setScan, setStatus, workspacePath]);

  useEffect(() => {
    if (!scanQuery.error) return;
    setFrame(null);
    setScanError(toErrorMessage(scanQuery.error, "ROI workspace load failed"));
  }, [scanQuery.error, setFrame, setScanError]);

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
    setContrast(null);
  }, [activeRequestKey, setContrast]);

  useEffect(() => {
    if (!workspacePath || workspacePath !== activeWorkspacePath || !request) {
      setFrame(null);
      setFrameLoading(false);
      return;
    }

    return loadCanvasResources({
      start: () => {
        setFrameLoading(true);
        setFrameError(null);
        setStatus("Loading ROI frame");
      },
      load: (signal) => studioClient.loadRoiFrame(workspacePath, request, contrast, signal),
      commit: (nextFrame) => {
        setFrame(nextFrame);
        setContrastState(nextFrame);
      },
      reject: (cause) => {
        setFrame(null);
        setFrameError(toErrorMessage(cause, "ROI frame load failed"));
      },
      settle: () => setFrameLoading(false),
    });
  }, [
    activeRequestKey,
    activeWorkspacePath,
    contrast,
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
    const randomRoi = randomPosition?.rois[Math.floor(Math.random() * randomPosition.rois.length)] ?? null;
    const channel = randomPosition ? randomPosition.channels[0] ?? null : null;
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

  return {
    workspacePath,
    scan,
    position,
    request,
    frame,
    contrastDomain,
    contrastMin,
    contrastMax,
    scanLoading,
    frameLoading,
    workspacePath,
    error,
    toasts,
    selection,
    setSelection: changeSelection,
    setContrast,
    shuffleSelection,
  };
}
