import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  FrameResult,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import { useCanvasResourceTransaction } from "@lisca/ui";
import {
  alignStateFromCurrent,
  buildBboxCsv,
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  createDefaultAlignGrid,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { Effect } from "effect";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { studioClient, toErrorMessage } from "../api/studio-client";
import { useAutoExcludePreviewMutation, useScanSourceQuery } from "../api/studio-queries";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { isDoneCropStatus } from "../utils/crop-status";
import { lockedStudioSelection, studioMaskChannel, toStudioSource } from "../utils/studio-source";
import {
  savedAlignStateKey,
  sourceKey,
  useStudioAlignStore,
  type ExcludedByPosition,
} from "./studio-align-store";
import { useStudioStore } from "./studio-store";

const emptyExcludedCells: AlignGridCellCoord[] = [];
const nextExclusionPreviewMs = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type StudioAlignState = {
  workspacePath: string | null;
  source: AlignerSource | null;
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
  cropStartConfirm: CropStartConfirmState | null;
  cropConfirm: CropConfirmState | null;
  findingFirstUnaligned: boolean;
  status: string | null;
  canGoBack: boolean;
  goBack: () => void;
  resetCurrent: () => void;
  goToFirstUnaligned: () => Promise<void>;
  startConfirmedCrop: () => void;
  cancelCropStartConfirm: () => void;
  confirmCropOverwrite: () => void;
  skipExistingCrop: () => void;
  cancelCropConfirm: () => void;
  cancelCrop: () => Promise<void>;
  saveAndAdvance: () => Promise<boolean>;
  autoExclude: () => Promise<void>;
};

export type CropStartConfirmState = {
  positions: number[];
};

export type CropConfirmState = {
  positions: number[];
  existingPositions: number[];
};

export function useStudioAlignState(): StudioAlignState {
  const info1 = useStudioStore((state) => state.info1);
  const info3 = useStudioStore((state) => state.info3);
  const dataSourceKind = useStudioStore((state) => state.dataSourceKind);
  const {
    source,
    setSource,
    workspacePath,
    setWorkspacePath,
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
    error,
    setError,
    status,
    setStatus,
    applySourceScan,
    applyLoadedFrame,
  } = useStudioAlignStore();
  const [findingFirstUnaligned, setFindingFirstUnaligned] = useState(false);
  const [cropProgress, setCropProgress] = useState<CropRoiProgress | null>(null);
  const [cropStartConfirm, setCropStartConfirm] = useState<CropStartConfirmState | null>(null);
  const [cropConfirm, setCropConfirm] = useState<CropConfirmState | null>(null);
  const cropRequestIdRef = useRef<string | null>(null);
  const loadCanvasResources = useCanvasResourceTransaction();
  const activeSource = useMemo(
    () => toStudioSource(dataSourceKind, info1),
    [dataSourceKind, info1],
  );
  const activeWorkspacePath = info1.saveTo.trim() || null;
  const activeSourceKey = sourceKey(source);
  const maskChannel = useMemo(() => studioMaskChannel(info3), [info3]);
  const lockedSelection = useMemo(
    () => (scan ? lockedStudioSelection(scan, selection, maskChannel) : selection),
    [maskChannel, scan, selection],
  );
  const scanQuery = useScanSourceQuery(source);
  const autoExcludePreview = useAutoExcludePreviewMutation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const currentExcludedCells = useMemo(
    () => excludedCellsByPosition[lockedSelection.pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, lockedSelection.pos],
  );
  const displayedExcludedCells = useMemo(
    () =>
      excludedCellsByPosition[loadedFrameSelection?.pos ?? lockedSelection.pos] ??
      emptyExcludedCells,
    [excludedCellsByPosition, loadedFrameSelection?.pos, lockedSelection.pos],
  );
  const visibleCounts = useMemo(
    () =>
      frame
        ? countVisibleAlignGridCells(frame, grid, displayedExcludedCells)
        : { included: 0, excluded: 0 },
    [displayedExcludedCells, frame, grid],
  );
  const cropping = cropProgress != null && !isDoneCropStatus(cropProgress.status);

  useEffect(() => {
    setWorkspacePath(activeWorkspacePath);
  }, [activeWorkspacePath, setWorkspacePath]);

  useEffect(() => {
    setSource(activeSource);
  }, [activeSource, setSource]);

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
    if (!scan) return;
    if (
      selection.pos === lockedSelection.pos &&
      selection.channel === lockedSelection.channel &&
      selection.time === lockedSelection.time &&
      selection.z === lockedSelection.z
    ) {
      return;
    }
    setSelection(lockedSelection);
  }, [lockedSelection, scan, selection, setSelection]);

  useEffect(() => {
    if (!source || !scan) {
      setFrameLoading(false);
      return;
    }
    const alignStateKey = workspacePath
      ? savedAlignStateKey(workspacePath, lockedSelection.pos)
      : null;

    return loadCanvasResources({
      start: () => {
        setFrameLoading(true);
        setError(null);
        setStatus("Loading frame");
      },
      load: (signal) => {
        const framePromise = Effect.runPromise(
          loadFrameEffect(studioClient, source, lockedSelection, null),
          { signal },
        );
        const alignStatePromise = workspacePath
          ? queryClient.fetchQuery<SavedAlignState | null>({
              queryKey: ["studio", "align-state", alignStateKey],
              queryFn: () => studioClient.loadAlignState(workspacePath, lockedSelection.pos),
              retry: false,
            })
          : Promise.resolve(null);
        return Promise.all([framePromise, alignStatePromise]);
      },
      commit: ([nextFrame, savedAlignState]) => {
        applyLoadedFrame(
          lockedSelection,
          nextFrame,
          alignStateKey
            ? { stateKey: alignStateKey, pos: lockedSelection.pos, saved: savedAlignState }
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
    lockedSelection,
    loadCanvasResources,
    queryClient,
    scan,
    setError,
    setFrame,
    setFrameLoading,
    setStatus,
    source,
    workspacePath,
  ]);

  const variationExcludeCells = useCallback(async (): Promise<AlignGridCellCoord[]> => {
    if (!source || !frame) return [];
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return [];
    const preview = await autoExcludePreview.mutateAsync({
      source,
      selection: lockedSelection,
      cells,
    });
    return preview.cellScores
      .filter((cell) => cell.score <= preview.threshold)
      .map(({ i, j }) => ({ i, j }));
  }, [autoExcludePreview, frame, grid, lockedSelection, source]);

  const positionIndex = useMemo(
    () => scan?.positions.indexOf(lockedSelection.pos) ?? -1,
    [lockedSelection.pos, scan],
  );
  const canGoBack = positionIndex > 0;
  const goBack = useCallback(() => {
    if (saving || !scan || positionIndex <= 0) return;
    setSelection({ pos: scan.positions[positionIndex - 1] });
  }, [positionIndex, saving, scan, setSelection]);

  const resetCurrent = useCallback(() => {
    if (saving) return;
    setGrid({ ...createDefaultAlignGrid(), enabled: true });
    setExcludedCellsForCurrentPosition([]);
    setStatus(`Reset Pos${lockedSelection.pos}`);
  }, [lockedSelection.pos, saving, setExcludedCellsForCurrentPosition, setGrid, setStatus]);

  const goToFirstUnaligned = useCallback(async () => {
    if (!workspacePath || !scan || saving || findingFirstUnaligned) return;
    setFindingFirstUnaligned(true);
    setError(null);
    try {
      setStatus("Finding first unaligned");
      const savedPositions = new Set(await studioClient.listSavedBboxPositions(workspacePath));
      const firstUnaligned = scan.positions.find((pos) => !savedPositions.has(pos));
      if (firstUnaligned == null) {
        setStatus("All positions aligned");
        return;
      }
      setSelection({ pos: firstUnaligned });
      setStatus(`Jumped to Pos${firstUnaligned}`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Saved position scan failed"));
    } finally {
      setFindingFirstUnaligned(false);
    }
  }, [findingFirstUnaligned, saving, scan, setError, setSelection, setStatus, workspacePath]);

  const advanceToNextPosition = useCallback(() => {
    const posOptions = scan?.positions ?? [];
    const currentIndex = posOptions.indexOf(lockedSelection.pos);
    const nextPos = currentIndex >= 0 ? posOptions[currentIndex + 1] : null;
    if (nextPos == null) return false;
    setSelection({ pos: nextPos });
    return true;
  }, [lockedSelection.pos, scan, setSelection]);

  const runCrop = useCallback(
    async (positions: number[], overwrite: boolean) => {
      if (!workspacePath || !source || positions.length === 0) return;
      const requestId = `studio-crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        await studioClient.cropRoi({
          requestId,
          workspacePath,
          source,
          positions,
          overwrite,
          outputFormat: "tiff",
        });
        stop = studioClient.onCropRoiProgress(requestId, (progress) => {
          setCropProgress(progress);
          if (isDoneCropStatus(progress.status)) {
            if (progress.status === "error") setError(progress.error ?? "Crop failed");
            if (progress.status === "completed") void navigate({ to: "/annotate" });
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
    [navigate, setError, source, workspacePath],
  );

  const cropBatchWithOverwriteCheck = useCallback(
    async (positions: number[]) => {
      if (!workspacePath || positions.length === 0) return;
      const existing = (
        await Promise.all(
          positions.map(async (pos) => ({
            pos,
            exists: await studioClient.roiPosExists(workspacePath, pos),
          })),
        )
      )
        .filter((entry) => entry.exists)
        .map((entry) => entry.pos);
      if (existing.length > 0) {
        setCropConfirm({ positions, existingPositions: existing });
        return;
      }
      await runCrop(positions, false);
    },
    [runCrop, workspacePath],
  );

  const maybeCropWhenAllPositionsSaved = useCallback(async () => {
    if (!workspacePath || !scan) return;
    const savedPositions = new Set(await studioClient.listSavedBboxPositions(workspacePath));
    const allPositionsSaved = scan.positions.every((pos) => savedPositions.has(pos));
    if (!allPositionsSaved) return;
    setCropStartConfirm({ positions: scan.positions });
  }, [scan, workspacePath]);

  const startConfirmedCrop = useCallback(() => {
    const next = cropStartConfirm;
    if (!next) return;
    setCropStartConfirm(null);
    void cropBatchWithOverwriteCheck(next.positions);
  }, [cropBatchWithOverwriteCheck, cropStartConfirm]);

  const cancelCropStartConfirm = useCallback(() => {
    setCropStartConfirm(null);
  }, []);

  const confirmCropOverwrite = useCallback(() => {
    const next = cropConfirm;
    if (!next) return;
    setCropConfirm(null);
    void runCrop(next.positions, true);
  }, [cropConfirm, runCrop]);

  const skipExistingCrop = useCallback(() => {
    const next = cropConfirm;
    if (!next) return;
    setCropConfirm(null);
    const existing = new Set(next.existingPositions);
    const remaining = next.positions.filter((pos) => !existing.has(pos));
    if (remaining.length === 0) {
      setStatus(`Skipped ${next.existingPositions.length} existing ROI output(s)`);
      void navigate({ to: "/annotate" });
      return;
    }
    void runCrop(remaining, false);
  }, [cropConfirm, navigate, runCrop, setStatus]);

  const cancelCropConfirm = useCallback(() => {
    setCropConfirm(null);
  }, []);

  const cancelCrop = useCallback(async () => {
    const requestId = cropRequestIdRef.current;
    if (!requestId) return;
    setCropProgress(await studioClient.cancelCropRoi(requestId));
  }, []);

  const saveAndAdvance = useCallback(async () => {
    if (!workspacePath || !frame) return false;
    setSaving(true);
    setError(null);
    try {
      const [edgeCells, thresholdCells] = await Promise.all([
        Promise.resolve(collectAlignGridEdgeCells(frame, grid)),
        variationExcludeCells(),
      ]);
      const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
        ...edgeCells,
        ...thresholdCells,
      ]);
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      const csv = buildBboxCsv(frame, grid, finalExcludedCells);
      const alignState = alignStateFromCurrent(grid, finalExcludedCells);
      const [result] = await Promise.all([
        studioClient.saveBbox(workspacePath, lockedSelection.pos, csv, alignState),
        delay(nextExclusionPreviewMs),
      ]);
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      queryClient.setQueryData<SavedAlignState | null>(
        ["studio", "align-state", savedAlignStateKey(workspacePath, lockedSelection.pos)],
        alignState,
      );
      setStatus(`Saved bbox/Pos${lockedSelection.pos}.csv`);
      const advanced = advanceToNextPosition();
      if (!advanced) await maybeCropWhenAllPositionsSaved();
      return true;
    } catch (cause) {
      setError(toErrorMessage(cause, "Save failed"));
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    advanceToNextPosition,
    currentExcludedCells,
    frame,
    grid,
    lockedSelection.pos,
    maybeCropWhenAllPositionsSaved,
    queryClient,
    setError,
    setExcludedCellsForCurrentPosition,
    setSaving,
    setStatus,
    variationExcludeCells,
    workspacePath,
  ]);

  const autoExclude = useCallback(async () => {
    if (!frame) return;
    try {
      setStatus("Auto exclude preview");
      const [edgeCells, variationCells] = await Promise.all([
        Promise.resolve(collectAlignGridEdgeCells(frame, grid)),
        variationExcludeCells(),
      ]);
      const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
        ...edgeCells,
        ...variationCells,
      ]);
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      setStatus(`Auto excluded ${finalExcludedCells.length - currentExcludedCells.length} cells`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Auto exclude preview failed"));
    }
  }, [
    currentExcludedCells,
    frame,
    grid,
    setError,
    setExcludedCellsForCurrentPosition,
    setStatus,
    variationExcludeCells,
  ]);

  return {
    workspacePath,
    source,
    scan,
    scanLoading: source != null && scanQuery.isFetching,
    frameLoading,
    error,
    selection: lockedSelection,
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
    cropStartConfirm,
    cropConfirm,
    findingFirstUnaligned,
    status,
    canGoBack,
    goBack,
    resetCurrent,
    goToFirstUnaligned,
    startConfirmedCrop,
    cancelCropStartConfirm,
    confirmCropOverwrite,
    skipExistingCrop,
    cancelCropConfirm,
    cancelCrop,
    saveAndAdvance,
    autoExclude,
  };
}
