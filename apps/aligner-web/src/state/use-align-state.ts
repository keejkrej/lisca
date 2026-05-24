import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  AutoExcludePreviewResponse,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  FrameResult,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import { useCanvasResourceTransaction, useShellWorkspace } from "@lisca/ui";
import {
  alignStateFromCurrent,
  buildBboxCsv,
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Effect } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  alignerClient,
  toErrorMessage,
  useAutoExcludePreviewMutation,
  useSavedBboxPositionsQuery,
  useScanSourceQuery,
} from "../api/aligner-queries";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import { runClientEffect, toClientError } from "@lisca/client/runtime";
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
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  excludedCellsByPosition: ExcludedByPosition;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  currentExcludedCells: AlignGridCellCoord[];
  displayedExcludedCells: AlignGridCellCoord[];
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
  variationExcludePreview: VariationExcludePreview | null;
  variationExcludeLoading: boolean;
  variationExclude: () => Promise<void>;
  setVariationExcludeThreshold: (threshold: number) => void;
  cancelVariationExclude: () => void;
  applyVariationExclude: () => void;
  autoExclude: () => Promise<void>;
};

export type VariationExcludePreview = {
  preview: AutoExcludePreviewResponse;
  threshold: number;
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
    selection,
    loadedFrameSelection,
    setSelection,
    contrast,
    setContrast,
    frame,
    setFrame,
    grid,
    setGrid,
    toolMode,
    setToolMode,
    patternZoomLocked,
    setPatternZoomLocked,
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
    applyLoadedFrame,
  } = useAlignerStore();
  const loadCanvasResources = useCanvasResourceTransaction();
  const cropRequestIdRef = useRef<string | null>(null);
  const [cropConfirm, setCropConfirm] = useState<CropConfirmState | null>(null);
  const [variationExcludePreview, setVariationExcludePreview] =
    useState<VariationExcludePreview | null>(null);
  const activeSourceKey = sourceKey(source);
  const scanQuery = useScanSourceQuery(source);
  const savedPositionsQuery = useSavedBboxPositionsQuery(workspacePath, Boolean(workspacePath));
  const autoExcludePreview = useAutoExcludePreviewMutation();
  const queryClient = useQueryClient();

  const currentExcludedCells = useMemo(
    () => excludedCellsByPosition[selection.pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, selection.pos],
  );
  const displayedExcludedCells = useMemo(
    () => excludedCellsByPosition[loadedFrameSelection?.pos ?? selection.pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, loadedFrameSelection?.pos, selection.pos],
  );
  const cropping = cropProgress != null && !isDoneCropStatus(cropProgress.status);

  const visibleCounts = useMemo(
    () =>
      frame
        ? countVisibleAlignGridCells(frame, grid, displayedExcludedCells)
        : { included: 0, excluded: 0 },
    [displayedExcludedCells, frame, grid],
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
    if (!source || !scan) {
      setFrameLoading(false);
      return;
    }
    const alignStateKey = workspacePath ? savedAlignStateKey(workspacePath, selection.pos) : null;

    return loadCanvasResources({
      start: () => {
        setFrameLoading(true);
        setError(null);
        setStatus("Loading frame");
      },
      load: () =>
        Effect.all([
          loadFrameEffect(alignerClient, source, selection, contrast),
          workspacePath
            ? Effect.tryPromise({
                try: () =>
                  queryClient.fetchQuery<SavedAlignState | null>({
                    queryKey: ["aligner", "align-state", alignStateKey],
                    queryFn: () =>
                      runClientEffect(
                        alignerClient.loadAlignState(workspacePath, selection.pos),
                      ),
                    retry: false,
                  }),
                catch: toClientError,
              })
            : Effect.succeed(null as SavedAlignState | null),
        ]),
      commit: ([nextFrame, savedAlignState]) => {
        applyLoadedFrame(
          selection,
          nextFrame,
          alignStateKey
            ? { stateKey: alignStateKey, pos: selection.pos, saved: savedAlignState }
            : null,
        );
      },
      reject: (cause) => {
        setFrame(null);
        setError(
          cause instanceof Error && cause.message.startsWith("Frame request failed")
            ? effectErrorMessage(cause)
            : toErrorMessage(cause, "Frame or saved align state load failed"),
        );
      },
      settle: () => setFrameLoading(false),
    });
  }, [
    applyLoadedFrame,
    contrast,
    loadCanvasResources,
    queryClient,
    scan,
    selection,
    setError,
    setFrame,
    setFrameLoading,
    setStatus,
    source,
    workspacePath,
  ]);

  const saveCurrent = useCallback(async () => {
    if (!workspacePath || !frame) return false;
    setSaving(true);
    setError(null);
    try {
      const csv = buildBboxCsv(frame, grid, currentExcludedCells);
      const alignState = alignStateFromCurrent(grid, currentExcludedCells);
      const result = await runClientEffect(
        alignerClient.saveBbox(workspacePath, selection.pos, csv, alignState),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      queryClient.setQueryData<SavedAlignState | null>(
        ["aligner", "align-state", savedAlignStateKey(workspacePath, selection.pos)],
        alignState,
      );
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
    queryClient,
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
        await runClientEffect(
          alignerClient.cropRoi({
            requestId,
            workspacePath,
            source,
            positions,
            overwrite,
            outputFormat: "tiff",
          }),
        );
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
    const exists = await runClientEffect(
      alignerClient.roiPosExists(workspacePath, selection.pos),
    );
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
    const existing = await runClientEffect(
      Effect.all(
        savedPositions.map((pos) =>
          alignerClient
            .roiPosExists(workspacePath, pos)
            .pipe(Effect.map((exists) => ({ pos, exists }))),
        ),
      ).pipe(
        Effect.map((entries) =>
          entries.filter((entry) => entry.exists).map((entry) => entry.pos),
        ),
      ),
    );
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
    setCropProgress(await runClientEffect(alignerClient.cancelCropRoi(requestId)));
  }, [setCropProgress]);

  const previewVariationExclude = useCallback(async () => {
    if (!source || !frame) return null;
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return null;
    return autoExcludePreview.mutateAsync({
      source,
      selection,
      cells,
    });
  }, [autoExcludePreview, frame, grid, selection, source]);

  const cellsBelowThreshold = useCallback(
    (preview: AutoExcludePreviewResponse, threshold: number): AlignGridCellCoord[] =>
      preview.cellScores.filter((cell) => cell.score <= threshold).map(({ i, j }) => ({ i, j })),
    [],
  );

  const variationExclude = useCallback(async () => {
    if (!source || !frame) return;
    setStatus("Variation exclude preview");
    try {
      const preview = await previewVariationExclude();
      if (!preview) {
        setStatus("No visible cells for variation exclude");
        return;
      }
      setVariationExcludePreview({ preview, threshold: preview.threshold });
    } catch (cause) {
      setError(toErrorMessage(cause, "Variation exclude preview failed"));
    }
  }, [frame, previewVariationExclude, setError, setStatus, source]);

  const setVariationExcludeThreshold = useCallback((threshold: number) => {
    setVariationExcludePreview((current) => (current ? { ...current, threshold } : current));
  }, []);

  const cancelVariationExclude = useCallback(() => {
    setVariationExcludePreview(null);
    setStatus("Variation exclude cancelled");
  }, [setStatus]);

  const applyVariationExclude = useCallback(() => {
    if (!variationExcludePreview) return;
    const variationCells = cellsBelowThreshold(
      variationExcludePreview.preview,
      variationExcludePreview.threshold,
    );
    setExcludedCellsForCurrentPosition(
      mergeExcludedAlignGridCells(currentExcludedCells, variationCells),
    );
    setVariationExcludePreview(null);
    setStatus(
      `Variation excluded ${variationCells.length} of ${variationExcludePreview.preview.eligibleCellCount} cells`,
    );
  }, [
    cellsBelowThreshold,
    currentExcludedCells,
    setExcludedCellsForCurrentPosition,
    setStatus,
    variationExcludePreview,
  ]);

  const autoExclude = useCallback(async () => {
    if (!source || !frame) return;
    setStatus("Auto exclude");
    try {
      const [edgeCells, preview] = await Promise.all([
        Promise.resolve(collectAlignGridEdgeCells(frame, grid)),
        previewVariationExclude(),
      ]);
      const variationCells = preview ? cellsBelowThreshold(preview, preview.threshold) : [];
      const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
        ...edgeCells,
        ...variationCells,
      ]);
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      setStatus(`Auto excluded ${finalExcludedCells.length - currentExcludedCells.length} cells`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Auto exclude failed"));
    }
  }, [
    cellsBelowThreshold,
    currentExcludedCells,
    frame,
    grid,
    previewVariationExclude,
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
    patternZoomLocked,
    setPatternZoomLocked,
    excludedCellsByPosition,
    setExcludedCellsForCurrentPosition,
    currentExcludedCells,
    displayedExcludedCells,
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
    variationExcludePreview,
    variationExcludeLoading: autoExcludePreview.isPending,
    variationExclude,
    setVariationExcludeThreshold,
    cancelVariationExclude,
    applyVariationExclude,
    autoExclude,
  };
}
