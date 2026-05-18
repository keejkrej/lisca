import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  FrameResult,
  WorkspaceScan,
} from "@lisca/contracts";
import { useShellWorkspace } from "@lisca/ui";
import {
  countVisibleAlignGridCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  alignerClient,
  toErrorMessage,
  useAutoExcludePreviewMutation,
  useLoadAlignStateQuery,
  useSavedBboxPositionsQuery,
  useScanSourceQuery,
} from "../api/aligner-queries";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { alignStateFromCurrent, buildBboxCsv } from "../utils/align-output";
import { isDoneCropStatus } from "../utils/crop-status";
import {
  savedAlignStateKey,
  sourceKey,
  useAlignerStore,
  type ExcludedByPosition,
} from "./aligner-store";

const emptyExcludedCells: AlignGridCellCoord[] = [];

export type AlignState = {
  workspacePath: string | null;
  source: AlignerSource | null;
  setSource: (source: AlignerSource | null) => void;
  scan: WorkspaceScan | null;
  scanLoading: boolean;
  frameLoading: boolean;
  error: string | null;
  selection: FrameRequest;
  setSelection: (patch: Partial<FrameRequest>) => void;
  contrast: ContrastWindow | null;
  setContrast: (contrast: ContrastWindow | null) => void;
  frame: FrameResult | null;
  grid: AlignGridState;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  toolMode: AlignGridToolMode;
  setToolMode: (mode: AlignGridToolMode) => void;
  excludedCellsByPosition: ExcludedByPosition;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  currentExcludedCells: AlignGridCellCoord[];
  visibleCounts: { included: number; excluded: number };
  saving: boolean;
  cropping: boolean;
  cropProgress: CropRoiProgress | null;
  cropConfirm: CropConfirmState | null;
  status: string | null;
  saveCurrent: () => Promise<boolean>;
  cropCurrent: () => Promise<void>;
  cropBatch: () => Promise<void>;
  confirmCropOverwrite: () => void;
  skipExistingCrop: () => void;
  cancelCropConfirm: () => void;
  cancelCrop: () => Promise<void>;
  autoExclude: () => Promise<void>;
};

export type CropConfirmState = {
  kind: "single" | "batch";
  positions: number[];
  existingPositions: number[];
};

export function useAlignState(): AlignState {
  const workspace = useShellWorkspace();
  const {
    workspacePath,
    source,
    setSource,
    scan,
    scanSourceKey,
    appliedAlignStateKey,
    selection,
    setSelection,
    contrast,
    setContrast,
    frame,
    setFrame,
    grid,
    setGrid,
    toolMode,
    setToolMode,
    excludedCellsByPosition,
    setExcludedCellsForCurrentPosition,
    frameLoading,
    setFrameLoading,
    saving,
    setSaving,
    cropProgress,
    setCropProgress,
    error,
    setError,
    status,
    setStatus,
    setWorkspacePath,
    applySourceScan,
    applySavedAlignState,
  } = useAlignerStore();
  const frameLoadIdRef = useRef(0);
  const cropRequestIdRef = useRef<string | null>(null);
  const [cropConfirm, setCropConfirm] = useState<CropConfirmState | null>(null);
  const activeSourceKey = sourceKey(source);
  const scanQuery = useScanSourceQuery(source);
  const alignStateQuery = useLoadAlignStateQuery(workspacePath, selection, Boolean(scan));
  const savedPositionsQuery = useSavedBboxPositionsQuery(workspacePath, Boolean(workspacePath));
  const autoExcludePreview = useAutoExcludePreviewMutation();

  const currentExcludedCells = useMemo(
    () => excludedCellsByPosition[selection.pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, selection.pos],
  );
  const cropping = cropProgress != null && !isDoneCropStatus(cropProgress.status);

  const visibleCounts = useMemo(
    () =>
      frame
        ? countVisibleAlignGridCells(frame, grid, currentExcludedCells)
        : { included: 0, excluded: 0 },
    [currentExcludedCells, frame, grid],
  );

  useEffect(() => {
    if (workspace.workspacePath === workspacePath) return;
    if (workspace.workspacePath == null && workspacePath != null) {
      workspace.setWorkspacePath(workspacePath);
      return;
    }
    setWorkspacePath(workspace.workspacePath);
  }, [setWorkspacePath, workspace, workspacePath]);

  useEffect(() => {
    const sourcePath = source?.path ?? null;
    if (workspace.sourcePath !== sourcePath) {
      workspace.setSourcePath(sourcePath);
    }
  }, [source, workspace]);

  useEffect(() => {
    if (source && scanQuery.isFetching) {
      setError(null);
      setStatus("Scanning source");
    }
  }, [scanQuery.isFetching, setError, setStatus, source]);

  useEffect(() => {
    if (!scanQuery.data || !activeSourceKey || scanSourceKey === activeSourceKey) return;
    applySourceScan(activeSourceKey, scanQuery.data);
  }, [activeSourceKey, applySourceScan, scanQuery.data, scanSourceKey]);

  useEffect(() => {
    if (!scanQuery.error) return;
    setFrame(null);
    setError(toErrorMessage(scanQuery.error, "Source scan failed"));
  }, [scanQuery.error, setError, setFrame]);

  useEffect(() => {
    if (!workspacePath || alignStateQuery.data === undefined) return;
    const stateKey = savedAlignStateKey(workspacePath, selection.pos);
    if (appliedAlignStateKey === stateKey) return;
    applySavedAlignState(stateKey, selection.pos, alignStateQuery.data);
  }, [
    alignStateQuery.data,
    appliedAlignStateKey,
    applySavedAlignState,
    selection.pos,
    workspacePath,
  ]);

  useEffect(() => {
    if (!alignStateQuery.error) return;
    setError(toErrorMessage(alignStateQuery.error, "Saved align state load failed"));
  }, [alignStateQuery.error, setError]);

  useEffect(() => {
    frameLoadIdRef.current += 1;
    const loadId = frameLoadIdRef.current;

    if (!source || !scan) {
      setFrameLoading(false);
      return;
    }

    const abortController = new AbortController();
    const commit = (apply: () => void) => {
      if (frameLoadIdRef.current === loadId && !abortController.signal.aborted) apply();
    };

    setFrameLoading(true);
    setError(null);
    setStatus("Loading frame");

    const program = loadFrameEffect(alignerClient, source, selection, contrast).pipe(
      Effect.tap((nextFrame) =>
        Effect.sync(() =>
          commit(() => {
            setFrame(nextFrame);
            setStatus(null);
          }),
        ),
      ),
      Effect.catchAll((cause) =>
        Effect.sync(() =>
          commit(() => {
            setFrame(null);
            setError(effectErrorMessage(cause));
          }),
        ),
      ),
      Effect.ensuring(Effect.sync(() => commit(() => setFrameLoading(false)))),
    );

    void Effect.runPromiseExit(program, { signal: abortController.signal }).then((exit) => {
      if (!Exit.isFailure(exit) || abortController.signal.aborted) return;
      commit(() => {
        setFrame(null);
        setError(effectErrorMessage(exit.cause));
        setFrameLoading(false);
      });
    });

    return () => {
      abortController.abort();
    };
  }, [contrast, scan, selection, setError, setFrame, setFrameLoading, setStatus, source]);

  const saveCurrent = useCallback(async () => {
    if (!workspacePath || !frame) return false;
    setSaving(true);
    setError(null);
    try {
      const csv = buildBboxCsv(frame, grid, currentExcludedCells);
      const result = await alignerClient.saveBbox(
        workspacePath,
        selection.pos,
        csv,
        alignStateFromCurrent(grid, currentExcludedCells),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      setStatus(`Saved bbox/Pos${selection.pos}.csv`);
      return true;
    } catch (cause) {
      setError(toErrorMessage(cause, "Save failed"));
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    currentExcludedCells,
    frame,
    grid,
    selection.pos,
    setError,
    setSaving,
    setStatus,
    workspacePath,
  ]);

  const runCrop = useCallback(
    async (positions: number[], overwrite: boolean) => {
      if (!workspacePath || !source || positions.length === 0) return;
      const requestId = `crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cropRequestIdRef.current = requestId;
      setError(null);
      setCropProgress({
        requestId,
        status: "queued",
        position: null,
        completedPositions: 0,
        totalPositions: positions.length,
        completedRois: 0,
        totalRois: 0,
        message: "Queued crop",
      });
      let stop = () => {};
      try {
        await alignerClient.cropRoi({
          requestId,
          workspacePath,
          source,
          positions,
          overwrite,
          outputFormat: "tiff",
        });
        stop = alignerClient.onCropRoiProgress(requestId, (progress) => {
          setCropProgress(progress);
          if (isDoneCropStatus(progress.status)) {
            if (progress.status === "error") setError(progress.error ?? "Crop failed");
            stop();
          }
        });
      } catch (cause) {
        stop();
        const message = toErrorMessage(cause, "Crop failed");
        setError(message);
        setCropProgress({
          requestId,
          status: "error",
          position: null,
          completedPositions: 0,
          totalPositions: positions.length,
          completedRois: 0,
          totalRois: 0,
          message,
          error: message,
        });
      }
    },
    [setCropProgress, setError, source, workspacePath],
  );

  const cropCurrent = useCallback(async () => {
    if (!workspacePath || !source || !frame) return;
    const saved = await saveCurrent();
    if (!saved) return;
    const exists = await alignerClient.roiPosExists(workspacePath, selection.pos);
    if (exists) {
      setCropConfirm({
        kind: "single",
        positions: [selection.pos],
        existingPositions: [selection.pos],
      });
      return;
    }
    await runCrop([selection.pos], false);
  }, [frame, runCrop, saveCurrent, selection.pos, source, workspacePath]);

  const cropBatch = useCallback(async () => {
    if (!workspacePath || !source) return;
    const savedPositionsResult = await savedPositionsQuery.refetch();
    if (savedPositionsResult.error) {
      setError(toErrorMessage(savedPositionsResult.error, "Saved bbox positions load failed"));
      return;
    }
    const savedPositions = savedPositionsResult.data ?? [];
    if (savedPositions.length === 0) {
      setStatus("No saved bbox CSVs found");
      return;
    }
    const existing = (
      await Promise.all(
        savedPositions.map(async (pos) => ({
          pos,
          exists: await alignerClient.roiPosExists(workspacePath, pos),
        })),
      )
    )
      .filter((entry) => entry.exists)
      .map((entry) => entry.pos);
    if (existing.length > 0) {
      setCropConfirm({
        kind: "batch",
        positions: savedPositions,
        existingPositions: existing,
      });
      return;
    }
    await runCrop(savedPositions, false);
  }, [runCrop, savedPositionsQuery, setError, setStatus, source, workspacePath]);

  const confirmCropOverwrite = useCallback(() => {
    const next = cropConfirm;
    if (!next) return;
    setCropConfirm(null);
    void runCrop(next.positions, true);
  }, [cropConfirm, runCrop]);

  const skipExistingCrop = useCallback(() => {
    const next = cropConfirm;
    if (!next || next.kind !== "batch") return;
    setCropConfirm(null);
    const existing = new Set(next.existingPositions);
    const remaining = next.positions.filter((pos) => !existing.has(pos));
    if (remaining.length === 0) {
      setStatus(`Skipped ${next.existingPositions.length} existing ROI output(s)`);
      return;
    }
    void runCrop(remaining, false);
  }, [cropConfirm, runCrop, setStatus]);

  const cancelCropConfirm = useCallback(() => {
    setCropConfirm(null);
  }, []);

  const cancelCrop = useCallback(async () => {
    const requestId = cropRequestIdRef.current;
    if (!requestId) return;
    setCropProgress(await alignerClient.cancelCropRoi(requestId));
  }, [setCropProgress]);

  const autoExclude = useCallback(async () => {
    if (!source || !frame) return;
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return;
    setStatus("Auto exclude preview");
    try {
      const preview = await autoExcludePreview.mutateAsync({
        source,
        selection,
        cells,
      });
      const autoExcluded = preview.cellScores
        .filter((cell) => cell.score <= preview.threshold)
        .map(({ i, j }) => ({ i, j }));
      const apply = window.confirm(
        [
          `Auto exclude ${autoExcluded.length} of ${preview.eligibleCellCount} eligible cells?`,
          `Threshold: ${preview.threshold.toFixed(3)}`,
          `Score range: ${preview.scoreMin.toFixed(3)} - ${preview.scoreMax.toFixed(3)}`,
        ].join("\n"),
      );
      if (!apply) {
        setStatus("Auto exclude preview cancelled");
        return;
      }
      setExcludedCellsForCurrentPosition(
        mergeExcludedAlignGridCells(currentExcludedCells, autoExcluded),
      );
      setStatus(`Auto excluded ${autoExcluded.length} of ${preview.eligibleCellCount} cells`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Auto exclude preview failed"));
    }
  }, [
    autoExcludePreview,
    currentExcludedCells,
    frame,
    grid,
    selection,
    setError,
    setExcludedCellsForCurrentPosition,
    setStatus,
    source,
  ]);

  return {
    workspacePath,
    source,
    setSource,
    scan,
    scanLoading: source != null && scanQuery.isFetching,
    frameLoading,
    error,
    selection,
    setSelection,
    contrast,
    setContrast,
    frame,
    grid,
    setGrid,
    toolMode,
    setToolMode,
    excludedCellsByPosition,
    setExcludedCellsForCurrentPosition,
    currentExcludedCells,
    visibleCounts,
    saving,
    cropping,
    cropProgress,
    cropConfirm,
    status,
    saveCurrent,
    cropCurrent,
    cropBatch,
    confirmCropOverwrite,
    skipExistingCrop,
    cancelCropConfirm,
    cancelCrop,
    autoExclude,
  };
}
