import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { alignGridCellCoordKey, enumerateVisibleAlignGridCells } from "@lisca/utils";
import { useRef, useState, type MutableRefObject } from "react";

import type { SmartExcludeDownloadProgress } from "../types";
import { classifyExclusionCandidates } from "./classify-cells";
import { isSmartExcludeClassifierLoaded } from "./exclude-engine";
import { isSmartExcludeModelCached } from "./exclude-model-cache";

export type SmartExcludeDownloadState = {
  open: boolean;
  requiresDownload: boolean;
  progress: number;
  message: string;
  file?: string;
};

type PendingRun = {
  resolve: (modelCells: AlignGridCellCoord[]) => void;
  reject: (cause: Error) => void;
};

function getCandidateCells(
  frame: FrameResult,
  grid: AlignGridState,
  currentExcludedCells: readonly AlignGridCellCoord[],
) {
  const excludedKeys = new Set(currentExcludedCells.map(alignGridCellCoordKey));
  return enumerateVisibleAlignGridCells(frame, grid).filter(
    (cell) => !excludedKeys.has(alignGridCellCoordKey(cell)),
  );
}

function resetPendingRun(pendingRunRef: MutableRefObject<PendingRun | null>) {
  pendingRunRef.current = null;
}

export function useSmartExclude(options: {
  frame: FrameResult | null;
  grid: AlignGridState;
  currentExcludedCells: AlignGridCellCoord[];
  enabled: boolean;
  onComplete: (modelCells: AlignGridCellCoord[]) => void;
  onStatus?: (status: string | null) => void;
  onError?: (error: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [downloadState, setDownloadState] = useState<SmartExcludeDownloadState>({
    open: false,
    requiresDownload: false,
    progress: 0,
    message: "",
  });
  const runGenerationRef = useRef(0);
  const pendingRunRef = useRef<PendingRun | null>(null);
  const consentPromiseRef = useRef<Promise<AlignGridCellCoord[]> | null>(null);
  const onCompleteRef = useRef(options.onComplete);
  const onStatusRef = useRef(options.onStatus);
  const onErrorRef = useRef(options.onError);
  onCompleteRef.current = options.onComplete;
  onStatusRef.current = options.onStatus;
  onErrorRef.current = options.onError;

  const { frame, grid, currentExcludedCells, enabled } = options;

  const closeDownloadState = () => {
    setDownloadState({ open: false, requiresDownload: false, progress: 0, message: "" });
  };

  const updateDownloadProgress = (progress: SmartExcludeDownloadProgress) => {
    setDownloadState((current) => ({
      ...current,
      open: true,
      progress: progress.progress,
      message: progress.message,
      file: progress.file,
    }));
  };

  const runClassify = async (generation: number): Promise<AlignGridCellCoord[]> => {
    if (!frame) return [];
    const cells = getCandidateCells(frame, grid, currentExcludedCells);
    if (cells.length === 0) return [];

    onErrorRef.current?.(null);
    onStatusRef.current?.("Smart exclude");
    setDownloadState((current) => ({
      ...current,
      open: true,
      requiresDownload: false,
      message: "Classifying cells…",
    }));

    const modelCells = await classifyExclusionCandidates(frame, cells, {
      onProgress: updateDownloadProgress,
    });
    if (runGenerationRef.current !== generation) return [];
    closeDownloadState();
    return modelCells;
  };

  const ensureAndClassify = async (): Promise<AlignGridCellCoord[]> => {
    if (!enabled || !frame) return [];
    if (consentPromiseRef.current) return consentPromiseRef.current;

    const generation = runGenerationRef.current + 1;
    runGenerationRef.current = generation;
    setBusy(true);

    try {
      const cells = getCandidateCells(frame, grid, currentExcludedCells);
      if (cells.length === 0) return [];

      if (isSmartExcludeClassifierLoaded()) {
        return await runClassify(generation);
      }

      const cached = await isSmartExcludeModelCached();
      if (cached) {
        setDownloadState({
          open: true,
          requiresDownload: false,
          progress: 0,
          message: "Loading cached smart exclusion model…",
        });
        onStatusRef.current?.("Loading cached smart exclusion model…");
        return await runClassify(generation);
      }

      consentPromiseRef.current = new Promise<AlignGridCellCoord[]>((resolve, reject) => {
        pendingRunRef.current = {
          resolve: (modelCells) => {
            consentPromiseRef.current = null;
            resolve(modelCells);
          },
          reject: (cause) => {
            consentPromiseRef.current = null;
            reject(cause);
          },
        };
        // Release busy so the consent dialog can show the download action instead of a spinner.
        setBusy(false);
        setDownloadState({
          open: true,
          requiresDownload: true,
          progress: 0,
          message: "Confirm to download the smart exclusion model",
        });
        onStatusRef.current?.("Smart exclude requires a one-time model download");
      });
      return consentPromiseRef.current;
    } catch (cause) {
      if (runGenerationRef.current !== generation) return [];
      onErrorRef.current?.(cause instanceof Error ? cause.message : String(cause));
      onStatusRef.current?.(null);
      closeDownloadState();
      throw cause;
    } finally {
      if (runGenerationRef.current === generation && !pendingRunRef.current) {
        setBusy(false);
      }
    }
  };

  const confirmDownload = async () => {
    const pending = pendingRunRef.current;
    const generation = runGenerationRef.current + 1;
    runGenerationRef.current = generation;
    setBusy(true);
    setDownloadState({
      open: true,
      requiresDownload: true,
      progress: 0,
      message: "Starting model download…",
    });

    try {
      const modelCells = await runClassify(generation);
      if (pending) {
        pending.resolve(modelCells);
        resetPendingRun(pendingRunRef);
      } else {
        onCompleteRef.current(modelCells);
      }
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      if (pending) {
        pending.reject(error);
        resetPendingRun(pendingRunRef);
      }
      onErrorRef.current?.(error.message);
      onStatusRef.current?.(null);
      closeDownloadState();
    } finally {
      if (runGenerationRef.current === generation) setBusy(false);
    }
  };

  const cancelDownload = () => {
    const pending = pendingRunRef.current;
    if (pending) {
      pending.reject(new Error("Smart exclude cancelled"));
      resetPendingRun(pendingRunRef);
    }
    consentPromiseRef.current = null;
    closeDownloadState();
    onStatusRef.current?.(null);
  };

  const request = async () => {
    if (!enabled || !frame || busy || pendingRunRef.current) return;
    try {
      const modelCells = await ensureAndClassify();
      onCompleteRef.current(modelCells);
      onStatusRef.current?.(null);
    } catch (cause) {
      if (cause instanceof Error && cause.message === "Smart exclude cancelled") {
        onStatusRef.current?.("Smart exclude cancelled");
        return;
      }
      onErrorRef.current?.(cause instanceof Error ? cause.message : String(cause));
      onStatusRef.current?.(null);
    }
  };

  return {
    busy,
    active: busy || downloadState.open,
    downloadState,
    request,
    ensureAndClassify,
    confirmDownload,
    cancelDownload,
  };
}
