import type {
  AlignGridCellCoord,
  AlignGridState,
  OccupancyPromptExampleInput,
} from "@lisca/contracts";
import { alignGridCellCoordKey, type FrameResult } from "@lisca/utils";
import { createEffect, createMemo, createSignal, on, onCleanup, type Accessor } from "solid-js";

import type { SmartModelDownloadState, SmartModelGate } from "../shared/model-gate";
import { useLatestRef } from "../shared/use-latest-ref";
import {
  occupancyColdStartStatus,
  occupancyCorrectionsFromExclusionChange,
  promptExamplesFromCorrections,
} from "./occupancy";
import type { SmartExcludeProvider } from "./provider";
import { getSmartExcludeCandidateCells } from "./shared";
import type {
  ClassifyExclusionCandidatesOptions,
  ClassifyExclusionInput,
  OccupancyPackStatus,
  OccupancyRescoreMode,
} from "./types";

export type SmartExcludeDownloadState = SmartModelDownloadState;
export type { OccupancyPackStatus, OccupancyRescoreMode };

const RECORD_DEBOUNCE_MS = 400;
const STATUS_FRAME: FrameResult = { width: 0, height: 0, pixels: new Uint8Array() };

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
  workspacePath?: Accessor<string | null>;
  /** Default `onRecord`: after a debounced correction, re-score remaining sites if the pack is ready. `onRequest` waits for Smart exclude. */
  occupancyRescore?: Accessor<OccupancyRescoreMode>;
  occupancyRecordDebounceMs?: number;
  onComplete: (modelCells: AlignGridCellCoord[]) => void;
  onOccupancyRescore?: (modelCells: AlignGridCellCoord[]) => void;
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
  const [occupancyStatus, setOccupancyStatus] = createSignal<OccupancyPackStatus | null>(
    options.workspacePath?.() ? occupancyColdStartStatus() : null,
  );
  const active = createMemo(() => busy() || (options.model ? downloadState().open : false));

  let runGeneration = 0;
  let disposed = false;
  let pendingRun: PendingRun | null = null;
  let consentPromise: Promise<AlignGridCellCoord[]> | null = null;
  let pendingRecord: OccupancyPromptExampleInput[] = [];
  let recordTimer: ReturnType<typeof setTimeout> | null = null;

  const onCompleteRef = useLatestRef(() => options.onComplete);
  const onOccupancyRescoreRef = useLatestRef(() => options.onOccupancyRescore);
  const onStatusRef = useLatestRef(() => options.onStatus);
  const onErrorRef = useLatestRef(() => options.onError);

  onCleanup(() => {
    disposed = true;
    runGeneration += 1;
    pendingRun?.reject(new Error("Smart exclude cancelled"));
    pendingRun = null;
    consentPromise = null;
    if (recordTimer) {
      clearTimeout(recordTimer);
      recordTimer = null;
    }
    pendingRecord = [];
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

  const occupancyOptions = (
    generation: number,
    extra?: ClassifyExclusionCandidatesOptions,
  ): ClassifyExclusionCandidatesOptions => ({
    ...extra,
    onOccupancy: (status) => {
      if (disposed || runGeneration !== generation) return;
      setOccupancyStatus(status);
      extra?.onOccupancy?.(status);
    },
  });

  const classifyInput = (
    frame: FrameResult,
    cells: ClassifyExclusionInput["cells"],
    extras?: Partial<ClassifyExclusionInput>,
  ): ClassifyExclusionInput => ({
    frame,
    cells,
    workspacePath: options.workspacePath?.() ?? null,
    ...extras,
  });

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
      classifyInput(frame, cells),
      occupancyOptions(
        generation,
        options.model
          ? {
              onProgress: (progress) => {
                if (!disposed && runGeneration === generation) updateDownloadProgress(progress);
              },
            }
          : undefined,
      ),
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
        return await options.provider.classify(
          classifyInput(frame, cells),
          occupancyOptions(generation),
        );
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
      onStatusRef.current?.(occupancyStatus()?.message ?? null);
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

  const refreshOccupancyStatus = async () => {
    const workspacePath = options.workspacePath?.();
    if (disposed || !workspacePath) return;
    try {
      await options.provider.classify(
        classifyInput(options.frame() ?? STATUS_FRAME, [], {
          workspacePath,
          persistPromptPack: false,
        }),
        {
          onOccupancy: (status) => {
            if (disposed) return;
            setOccupancyStatus(status);
          },
        },
      );
    } catch {
      // Source may not be selected yet; keep the seeded not-ready hint.
    }
  };

  createEffect(
    on(
      () => options.workspacePath?.() ?? null,
      (path) => {
        if (disposed) return;
        if (!path) {
          setOccupancyStatus(null);
          return;
        }
        setOccupancyStatus(occupancyColdStartStatus());
        void refreshOccupancyStatus();
      },
    ),
  );

  const flushRecord = async () => {
    const examples = pendingRecord;
    pendingRecord = [];
    recordTimer = null;
    const frame = options.frame();
    const workspacePath = options.workspacePath?.();
    if (disposed || !frame || !workspacePath || examples.length === 0) return;
    try {
      let packReady = occupancyStatus()?.packReady ?? false;
      await options.provider.classify(
        classifyInput(frame, [], {
          workspacePath,
          persistPromptPack: true,
          appendPromptExamples: true,
          promptExamples: examples,
        }),
        {
          onOccupancy: (status) => {
            if (disposed) return;
            packReady = status.packReady ?? false;
            setOccupancyStatus(status);
            onStatusRef.current?.(status.message ?? null);
          },
        },
      );
      const rescoreMode = options.occupancyRescore?.() ?? "onRecord";
      if (disposed || !packReady || rescoreMode !== "onRecord") return;
      const skip = new Set(examples.map((example) => alignGridCellCoordKey(example.cell)));
      const candidates = getSmartExcludeCandidateCells(
        frame,
        options.grid(),
        options.currentExcludedCells(),
      ).filter((cell) => !skip.has(alignGridCellCoordKey(cell)));
      if (candidates.length === 0) return;
      const modelCells = await options.provider.classify(classifyInput(frame, candidates));
      if (disposed || modelCells.length === 0) return;
      onOccupancyRescoreRef.current?.(modelCells);
    } catch (cause) {
      if (disposed) return;
      onErrorRef.current?.(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const recordExclusionChange = (
    previous: readonly AlignGridCellCoord[],
    next: readonly AlignGridCellCoord[],
  ) => {
    const frame = options.frame();
    if (disposed || !frame || !options.workspacePath?.()) return;
    const examples = promptExamplesFromCorrections(
      frame,
      options.grid(),
      occupancyCorrectionsFromExclusionChange(previous, next),
    );
    if (examples.length === 0) return;
    pendingRecord.push(...examples);
    if (recordTimer) clearTimeout(recordTimer);
    const debounceMs = options.occupancyRecordDebounceMs ?? RECORD_DEBOUNCE_MS;
    recordTimer = setTimeout(() => {
      void flushRecord();
    }, debounceMs);
  };

  return {
    busy,
    active,
    downloadState,
    occupancyStatus,
    request,
    recordExclusionChange,
    ensureAndClassify,
    confirmDownload,
    cancelDownload,
  };
}
