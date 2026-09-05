import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { createMemo, createSignal, onCleanup, type Accessor } from "solid-js";

import type { SmartModelDownloadState, SmartModelGate } from "../shared/model-gate";
import { useLatestRef } from "../shared/use-latest-ref";
import type { SmartExcludeProvider } from "./provider";
import { getSmartExcludeCandidateCells } from "./shared";

export type SmartExcludeDownloadState = SmartModelDownloadState;

type PendingRun = {
  resolve: (modelCells: AlignGridCellCoord[]) => void;
  reject: (cause: Error) => void;
};

export function useSmartExclude(options: {
  provider: SmartExcludeProvider;
  model?: SmartModelGate;
  frame: Accessor<FrameResult | null>;
  grid: Accessor<AlignGridState>;
  currentExcludedCells: Accessor<AlignGridCellCoord[]>;
  enabled: Accessor<boolean>;
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
  const active = createMemo(() => busy() || (options.model ? downloadState().open : false));

  let runGeneration = 0;
  let disposed = false;
  let pendingRun: PendingRun | null = null;
  let consentPromise: Promise<AlignGridCellCoord[]> | null = null;

  const onCompleteRef = useLatestRef(() => options.onComplete);
  const onStatusRef = useLatestRef(() => options.onStatus);
  const onErrorRef = useLatestRef(() => options.onError);

  onCleanup(() => {
    disposed = true;
    runGeneration += 1;
    pendingRun?.reject(new Error("Smart exclude cancelled"));
    pendingRun = null;
    consentPromise = null;
  });

  const closeDownloadState = () => {
    setDownloadState({ open: false, requiresDownload: false, progress: 0, message: "" });
  };

  const updateDownloadProgress = (progress: {
    progress: number;
    message: string;
    file?: string;
  }) => {
    setDownloadState((current) => ({
      ...current,
      open: true,
      progress: progress.progress,
      message: progress.message,
      file: progress.file,
    }));
  };

  const runClassify = async (generation: number): Promise<AlignGridCellCoord[]> => {
    const frame = options.frame();
    if (!frame) return [];
    const cells = getSmartExcludeCandidateCells(
      frame,
      options.grid(),
      options.currentExcludedCells(),
    );
    if (cells.length === 0) return [];

    onErrorRef.current?.(null);
    onStatusRef.current?.("Smart exclude");
    if (options.model) {
      setDownloadState((current) => ({
        ...current,
        open: true,
        requiresDownload: false,
        message: "Classifying cells…",
      }));
    }

    const modelCells = await options.provider.classify(
      { frame, cells },
      options.model
        ? {
            onProgress: (progress) => {
              if (!disposed && runGeneration === generation) updateDownloadProgress(progress);
            },
          }
        : undefined,
    );
    if (runGeneration !== generation) return [];
    closeDownloadState();
    return modelCells;
  };

  const classifyNow = async (generation: number): Promise<AlignGridCellCoord[]> => {
    if (!options.model) {
      return runClassify(generation);
    }

    const model = options.model;
    if (model.isLoaded()) {
      return runClassify(generation);
    }

    const cached = await model.isCached();
    if (disposed || runGeneration !== generation) return [];
    if (cached) {
      setDownloadState({
        open: true,
        requiresDownload: false,
        progress: 0,
        message: "Loading cached smart exclusion model…",
      });
      onStatusRef.current?.("Loading cached smart exclusion model…");
      return runClassify(generation);
    }

    return new Promise<AlignGridCellCoord[]>((resolve, reject) => {
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
      setBusy(false);
      setDownloadState({
        open: true,
        requiresDownload: true,
        progress: 0,
        message: "Confirm to download the smart exclusion model",
      });
      onStatusRef.current?.("Smart exclude requires a one-time model download");
    });
  };

  const ensureAndClassify = async (): Promise<AlignGridCellCoord[]> => {
    const frame = options.frame();
    if (disposed || !options.enabled() || !frame) return [];
    if (consentPromise) return consentPromise;

    const generation = runGeneration + 1;
    runGeneration = generation;
    setBusy(true);

    try {
      const cells = getSmartExcludeCandidateCells(
        frame,
        options.grid(),
        options.currentExcludedCells(),
      );
      if (cells.length === 0) return [];

      if (!options.model) {
        return await options.provider.classify({ frame, cells });
      }

      consentPromise = classifyNow(generation);
      return await consentPromise;
    } catch (cause) {
      if (runGeneration !== generation) return [];
      if (cause instanceof Error && cause.message === "Smart exclude cancelled") {
        onStatusRef.current?.("Smart exclude cancelled");
        closeDownloadState();
        throw cause;
      }
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
    if (disposed || !options.model) return;

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
      if (disposed) return;
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
    if (disposed || !options.enabled() || !options.frame() || busy() || pendingRun) return;
    try {
      const modelCells = await ensureAndClassify();
      if (disposed) return;
      onCompleteRef.current(modelCells);
      onStatusRef.current?.(null);
    } catch (cause) {
      if (disposed) return;
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
