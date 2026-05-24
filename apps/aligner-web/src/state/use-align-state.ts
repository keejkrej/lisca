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
import { resultData, resultFailureMessage, resultLoading } from "@lisca/client/atoms";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import { runClientEffect } from "@lisca/client/runtime";
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
import { useAtom, useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Effect } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { alignerClient } from "../api/aligner-port";
import { toErrorMessage } from "../api/aligner-client";
import {
  autoExcludePreviewAtom,
  scanIdleAtom,
  scanSourceAtom,
} from "../atoms/aligner-query-atoms";
import {
  alignerUiActions,
  alignerUiAtom,
  savedAlignStateKey,
  sourceKey,
  type ExcludedByPosition,
} from "../atoms/aligner-ui-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";

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
  const [ui, setUi] = useAtom(alignerUiAtom);
  const {
    workspacePath,
    source,
    scan,
    scanSourceKey,
    selection,
    loadedFrameSelection,
    contrast,
    frame,
    grid,
    toolMode,
    patternZoomLocked,
    excludedCellsByPosition,
    frameLoading,
    saving,
    cropProgress,
    error,
    status,
  } = ui;

  const setSource = useCallback(
    (next: AlignerSource | null) => alignerUiActions.setSource(setUi, next),
    [setUi],
  );
  const setSelection = useCallback(
    (patch: Partial<FrameRequest>) => alignerUiActions.setSelection(setUi, patch),
    [setUi],
  );
  const setContrast = useCallback(
    (next: ContrastWindow | null) => alignerUiActions.setContrast(setUi, next),
    [setUi],
  );
  const setGrid = useCallback(
    (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) =>
      alignerUiActions.setGrid(setUi, next),
    [setUi],
  );
  const setToolMode = useCallback(
    (mode: AlignGridToolMode) => alignerUiActions.setToolMode(setUi, mode),
    [setUi],
  );
  const setPatternZoomLocked = useCallback(
    (locked: boolean) => alignerUiActions.setPatternZoomLocked(setUi, locked),
    [setUi],
  );
  const setExcludedCellsForCurrentPosition = useCallback(
    (cells: Iterable<AlignGridCellCoord>) =>
      alignerUiActions.setExcludedCellsForCurrentPosition(setUi, cells),
    [setUi],
  );

  const loadCanvasResources = useCanvasResourceTransaction();
  const cropRequestIdRef = useRef<string | null>(null);
  const [cropConfirm, setCropConfirm] = useState<CropConfirmState | null>(null);
  const [variationExcludePreview, setVariationExcludePreview] =
    useState<VariationExcludePreview | null>(null);
  const [variationExcludeLoading, setVariationExcludeLoading] = useState(false);

  const activeSourceKey = sourceKey(source);
  const scanResult = useAtomValue(
    activeSourceKey ? scanSourceAtom(activeSourceKey) : scanIdleAtom,
  );
  const runAutoExcludePreview = useAtomSet(autoExcludePreviewAtom, { mode: "promise" });

  const currentExcludedCells = useMemo(
    () => excludedCellsByPosition[selection.pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, selection.pos],
  );
  const displayedExcludedCells = useMemo(
    () => excludedCellsByPosition[loadedFrameSelection?.pos ?? selection.pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, loadedFrameSelection?.pos, selection.pos],
  );
  const cropping = cropProgress != null && !isDoneCropStatus(cropProgress.status);
  const scanLoading = source != null && resultLoading(scanResult);

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
    alignerUiActions.setWorkspacePath(setUi, workspace.workspacePath);
  }, [setUi, workspace, workspacePath]);

  useEffect(() => {
    const sourcePath = source?.path ?? null;
    if (workspace.sourcePath !== sourcePath) {
      workspace.setSourcePath(sourcePath);
    }
  }, [source, workspace]);

  useEffect(() => {
    if (source && scanLoading) {
      alignerUiActions.setError(setUi, null);
      alignerUiActions.setStatus(setUi, "Scanning source");
    }
  }, [scanLoading, setUi, source]);

  useEffect(() => {
    const scanData = resultData(scanResult);
    if (!scanData || !activeSourceKey || scanSourceKey === activeSourceKey) return;
    alignerUiActions.applySourceScan(setUi, activeSourceKey, scanData);
  }, [activeSourceKey, scanResult, scanSourceKey, setUi]);

  useEffect(() => {
    const scanError = resultFailureMessage(scanResult);
    if (!scanError) return;
    alignerUiActions.setFrame(setUi, null);
    alignerUiActions.setError(setUi, toErrorMessage(scanError, "Source scan failed"));
  }, [scanResult, setUi]);

  useEffect(() => {
    if (!source || !scan) {
      alignerUiActions.setFrameLoading(setUi, false);
      return;
    }
    const alignStateKey = workspacePath ? savedAlignStateKey(workspacePath, selection.pos) : null;

    return loadCanvasResources({
      start: () => {
        alignerUiActions.setFrameLoading(setUi, true);
        alignerUiActions.setError(setUi, null);
        alignerUiActions.setStatus(setUi, "Loading frame");
      },
      load: () =>
        Effect.all([
          loadFrameEffect(alignerClient, source, selection, contrast),
          workspacePath
            ? alignerClient.loadAlignState(workspacePath, selection.pos)
            : Effect.succeed(null as SavedAlignState | null),
        ]),
      commit: ([nextFrame, savedAlignState]) => {
        alignerUiActions.applyLoadedFrame(setUi, selection, nextFrame, alignStateKey
          ? { stateKey: alignStateKey, pos: selection.pos, saved: savedAlignState }
          : null);
      },
      reject: (cause) => {
        alignerUiActions.setFrame(setUi, null);
        alignerUiActions.setError(
          setUi,
          cause instanceof Error && cause.message.startsWith("Frame request failed")
            ? effectErrorMessage(cause)
            : toErrorMessage(cause, "Frame or saved align state load failed"),
        );
      },
      settle: () => alignerUiActions.setFrameLoading(setUi, false),
    });
  }, [
    contrast,
    loadCanvasResources,
    scan,
    selection,
    setUi,
    source,
    workspacePath,
  ]);

  const saveCurrent = useCallback(async () => {
    if (!workspacePath || !frame) return false;
    alignerUiActions.setSaving(setUi, true);
    alignerUiActions.setError(setUi, null);
    try {
      const csv = buildBboxCsv(frame, grid, currentExcludedCells);
      const alignState = alignStateFromCurrent(grid, currentExcludedCells);
      const result = await runClientEffect(
        alignerClient.saveBbox(workspacePath, selection.pos, csv, alignState),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      alignerUiActions.setStatus(setUi, `Saved bbox/Pos${selection.pos}.csv`);
      return true;
    } catch (cause) {
      alignerUiActions.setError(setUi, toErrorMessage(cause, "Save failed"));
      return false;
    } finally {
      alignerUiActions.setSaving(setUi, false);
    }
  }, [currentExcludedCells, frame, grid, selection.pos, setUi, workspacePath]);

  const runCrop = useCallback(
    async (positions: number[], overwrite: boolean) => {
      if (!workspacePath || !source || positions.length === 0) return;
      const requestId = `crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cropRequestIdRef.current = requestId;
      alignerUiActions.setError(setUi, null);
      alignerUiActions.setCropProgress(setUi, {
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
          alignerUiActions.setCropProgress(setUi, progress);
          if (isDoneCropStatus(progress.status)) {
            if (progress.status === "error") {
              alignerUiActions.setError(setUi, progress.error ?? "Crop failed");
            }
            stop();
          }
        });
      } catch (cause) {
        stop();
        const message = toErrorMessage(cause, "Crop failed");
        alignerUiActions.setError(setUi, message);
        alignerUiActions.setCropProgress(setUi, {
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
    [setUi, source, workspacePath],
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
    let savedPositions: number[];
    try {
      savedPositions = await runClientEffect(
        alignerClient.listSavedBboxPositions(workspacePath),
      );
    } catch (cause) {
      alignerUiActions.setError(setUi, toErrorMessage(cause, "Saved bbox positions load failed"));
      return;
    }
    if (savedPositions.length === 0) {
      alignerUiActions.setStatus(setUi, "No saved bbox CSVs found");
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
  }, [runCrop, setUi, source, workspacePath]);

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
      alignerUiActions.setStatus(setUi, `Skipped ${next.existingPositions.length} existing ROI output(s)`);
      return;
    }
    void runCrop(remaining, false);
  }, [cropConfirm, runCrop, setUi]);

  const cancelCropConfirm = useCallback(() => {
    setCropConfirm(null);
  }, []);

  const cancelCrop = useCallback(async () => {
    const requestId = cropRequestIdRef.current;
    if (!requestId) return;
    alignerUiActions.setCropProgress(
      setUi,
      await runClientEffect(alignerClient.cancelCropRoi(requestId)),
    );
  }, [setUi]);

  const previewVariationExclude = useCallback(async () => {
    if (!source || !frame) return null;
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return null;
    setVariationExcludeLoading(true);
    try {
      return await runAutoExcludePreview({ source, selection, cells });
    } finally {
      setVariationExcludeLoading(false);
    }
  }, [frame, grid, runAutoExcludePreview, selection, source]);

  const cellsBelowThreshold = useCallback(
    (preview: AutoExcludePreviewResponse, threshold: number): AlignGridCellCoord[] =>
      preview.cellScores.filter((cell) => cell.score <= threshold).map(({ i, j }) => ({ i, j })),
    [],
  );

  const variationExclude = useCallback(async () => {
    if (!source || !frame) return;
    alignerUiActions.setStatus(setUi, "Variation exclude preview");
    try {
      const preview = await previewVariationExclude();
      if (!preview) {
        alignerUiActions.setStatus(setUi, "No visible cells for variation exclude");
        return;
      }
      setVariationExcludePreview({ preview, threshold: preview.threshold });
    } catch (cause) {
      alignerUiActions.setError(setUi, toErrorMessage(cause, "Variation exclude preview failed"));
    }
  }, [frame, previewVariationExclude, setUi, source]);

  const setVariationExcludeThreshold = useCallback((threshold: number) => {
    setVariationExcludePreview((current) => (current ? { ...current, threshold } : current));
  }, []);

  const cancelVariationExclude = useCallback(() => {
    setVariationExcludePreview(null);
    alignerUiActions.setStatus(setUi, "Variation exclude cancelled");
  }, [setUi]);

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
    alignerUiActions.setStatus(
      setUi,
      `Variation excluded ${variationCells.length} of ${variationExcludePreview.preview.eligibleCellCount} cells`,
    );
  }, [
    cellsBelowThreshold,
    currentExcludedCells,
    setExcludedCellsForCurrentPosition,
    setUi,
    variationExcludePreview,
  ]);

  const autoExclude = useCallback(async () => {
    if (!source || !frame) return;
    alignerUiActions.setStatus(setUi, "Auto exclude");
    try {
      const edgeCells = collectAlignGridEdgeCells(frame, grid);
      const preview = await previewVariationExclude();
      const variationCells = preview ? cellsBelowThreshold(preview, preview.threshold) : [];
      const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
        ...edgeCells,
        ...variationCells,
      ]);
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      alignerUiActions.setStatus(
        setUi,
        `Auto excluded ${finalExcludedCells.length - currentExcludedCells.length} cells`,
      );
    } catch (cause) {
      alignerUiActions.setError(setUi, toErrorMessage(cause, "Auto exclude failed"));
    }
  }, [
    cellsBelowThreshold,
    currentExcludedCells,
    frame,
    grid,
    previewVariationExclude,
    setExcludedCellsForCurrentPosition,
    setUi,
    source,
  ]);

  return {
    workspacePath,
    source,
    setSource,
    scan,
    scanLoading,
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
    variationExcludeLoading,
    variationExclude,
    setVariationExcludeThreshold,
    cancelVariationExclude,
    applyVariationExclude,
    autoExclude,
  };
}
