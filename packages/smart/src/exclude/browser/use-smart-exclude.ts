import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { alignGridCellCoordKey, enumerateVisibleAlignGridCells } from "@lisca/utils";
import { createEffect, createMemo, createSignal } from "solid-js";

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

function useLatestRef<T>(value: () => T) {
  const ref = { current: value() };
  createEffect(() => {
    ref.current = value();
  });
  return ref;
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
  const [busy, setBusy] = createSignal(false);
  const [downloadState, setDownloadState] = createSignal<SmartExcludeDownloadState>({
    open: false,
    requiresDownload: false,
    progress: 0,
    message: "",
  });
  const active = createMemo(() => busy() || downloadState().open);

  let runGeneration = 0;
  let pendingRun: PendingRun | null = null;
  let consentPromise: Promise<AlignGridCellCoord[]> | null = null;

  const onCompleteRef = useLatestRef(() => options.onComplete);
  const onStatusRef = useLatestRef(() => options.onStatus);
  const onErrorRef = useLatestRef(() => options.onError);

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
    const frame = options.frame;
    if (!frame) return [];
    const cells = getCandidateCells(frame, options.grid, options.currentExcludedCells);
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
    if (runGeneration !== generation) return [];
    closeDownloadState();
    return modelCells;
  };

  const ensureAndClassify = async (): Promise<AlignGridCellCoord[]> => {
    const frame = options.frame;
    if (!options.enabled || !frame) return [];
    if (consentPromise) return consentPromise;

    const generation = runGeneration + 1;
    runGeneration = generation;
    setBusy(true);

    try {
      const cells = getCandidateCells(frame, options.grid, options.currentExcludedCells);
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

      consentPromise = new Promise<AlignGridCellCoord[]>((resolve, reject) => {
        pendingRun = {
          resolve: (modelCells) => {
            consentPromise = null;
            resolve(modelCells);
          },
          reject: (cause) => {
            consentPromise = null;
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
      return consentPromise;
    } catch (cause) {
      if (runGeneration !== generation) return [];
      onErrorRef.current?.(cause instanceof Error ? cause.message : String(cause));
      onStatusRef.current?.(null);
      closeDownloadState();
      throw cause;
    } finally {
      if (runGeneration === generation && !pendingRun) {
        setBusy(false);
      }
    }
  };

  const confirmDownload = async () => {
    const pending = pendingRun;
    const generation = runGeneration + 1;
    runGeneration = generation;
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
        pendingRun = null;
      } else {
        onCompleteRef.current(modelCells);
      }
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      if (pending) {
        pending.reject(error);
        pendingRun = null;
      }
      onErrorRef.current?.(error.message);
      onStatusRef.current?.(null);
      closeDownloadState();
    } finally {
      if (runGeneration === generation) setBusy(false);
    }
  };

  const cancelDownload = () => {
    const pending = pendingRun;
    if (pending) {
      pending.reject(new Error("Smart exclude cancelled"));
      pendingRun = null;
    }
    consentPromise = null;
    closeDownloadState();
    onStatusRef.current?.(null);
  };

  const request = async () => {
    if (!options.enabled || !options.frame || busy() || pendingRun) return;
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
    active,
    downloadState,
    request,
    ensureAndClassify,
    confirmDownload,
    cancelDownload,
  };
}