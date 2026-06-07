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
import {
  cellsBelowVariationThreshold,
  cropPositionsAfterSkip,
  runCropRoi,
  type CropConfirmState,
} from "@lisca/client/align-session";
import { useAlignSessionCore } from "@lisca/client/align-session/react";
import { runClientEffect } from "@lisca/client/runtime";
import { useCanvasResourceTransaction, useShellWorkspace } from "@lisca/ui-native";
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

export type { CropConfirmState };

import { alignerClient, toErrorMessage } from "../api/aligner-port";
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

  const {
    actions: {
      setSource,
      setSelection,
      setContrast,
      setGrid,
      setToolMode,
      setPatternZoomLocked,
      setExcludedCellsForCurrentPosition,
    },
    meta: { scanLoading, frameLoading: _frameLoadingMeta, cropping },
    derived: { currentExcludedCells, displayedExcludedCells, visibleCounts },
  } = useAlignSessionCore({
    ui,
    setUi,
    actions: alignerUiActions,
    workspace: {
      workspacePath: workspace.workspacePath,
      setWorkspacePath: workspace.setWorkspacePath,
      sourcePath: workspace.sourcePath,
      setSourcePath: workspace.setSourcePath,
    },
    scan: { scanResult, activeSourceKey },
    toErrorMessage,
  });

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
      load: (signal) =>
        runClientEffect(
          Effect.all([
            loadFrameEffect(alignerClient, source, selection, contrast),
            workspacePath
              ? alignerClient.loadAlignState(workspacePath, selection.pos)
              : Effect.succeed(null as SavedAlignState | null),
          ]),
          { signal },
        ),
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
    const { included } = countVisibleAlignGridCells(frame, grid, currentExcludedCells);
    if (included === 0) {
      alignerUiActions.setError(
        setUi,
        "All grid cells are excluded — adjust exclusions before saving.",
      );
      return false;
    }
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
      await runCropRoi({
        client: alignerClient,
        request: { requestId, workspacePath, source, positions, overwrite, outputFormat: "tiff" },
        onProgress: (progress) => alignerUiActions.setCropProgress(setUi, progress),
        onError: (message) => alignerUiActions.setError(setUi, message),
        onCompleted: (progress) => {
          if (progress.message) alignerUiActions.setStatus(setUi, progress.message);
        },
        toErrorMessage,
      });
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
    const remaining = cropPositionsAfterSkip(next.positions, next.existingPositions);
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

  const variationExclude = useCallback(async () => {
    if (!source || !frame) return;
    alignerUiActions.setStatus(setUi, "Var exclude preview");
    try {
      const preview = await previewVariationExclude();
      if (!preview) {
        alignerUiActions.setStatus(setUi, "No visible cells for var exclude");
        return;
      }
      setVariationExcludePreview({ preview, threshold: preview.threshold });
    } catch (cause) {
      alignerUiActions.setError(setUi, toErrorMessage(cause, "Var exclude preview failed"));
    }
  }, [frame, previewVariationExclude, setUi, source]);

  const setVariationExcludeThreshold = useCallback((threshold: number) => {
    setVariationExcludePreview((current) => (current ? { ...current, threshold } : current));
  }, []);

  const cancelVariationExclude = useCallback(() => {
    setVariationExcludePreview(null);
    alignerUiActions.setStatus(setUi, "Var exclude cancelled");
  }, [setUi]);

  const applyVariationExclude = useCallback(() => {
    if (!variationExcludePreview) return;
    const variationCells = cellsBelowVariationThreshold(
      variationExcludePreview.preview,
      variationExcludePreview.threshold,
    );
    setExcludedCellsForCurrentPosition(
      mergeExcludedAlignGridCells(currentExcludedCells, variationCells),
    );
    setVariationExcludePreview(null);
    alignerUiActions.setStatus(
      setUi,
      `Var excluded ${variationCells.length} of ${variationExcludePreview.preview.eligibleCellCount} cells`,
    );
  }, [currentExcludedCells, setExcludedCellsForCurrentPosition, setUi, variationExcludePreview]);

  const autoExclude = useCallback(async () => {
    if (!source || !frame) return;
    alignerUiActions.setStatus(setUi, "Auto exclude");
    try {
      const edgeCells = collectAlignGridEdgeCells(frame, grid);
      const preview = await previewVariationExclude();
      const variationCells = preview ? cellsBelowVariationThreshold(preview, preview.threshold) : [];
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
    currentExcludedCells,
    frame,
    grid,
    previewVariationExclude,
    setExcludedCellsForCurrentPosition,
    setUi,
    source,
  ]);

  return useMemo(
    () => ({
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
    }),
    [
      applyVariationExclude,
      autoExclude,
      cancelCrop,
      cancelCropConfirm,
      cancelVariationExclude,
      confirmCropOverwrite,
      contrast,
      cropBatch,
      cropConfirm,
      cropCurrent,
      cropProgress,
      cropping,
      currentExcludedCells,
      displayedExcludedCells,
      error,
      excludedCellsByPosition,
      frame,
      frameLoading,
      grid,
      patternZoomLocked,
      saveCurrent,
      saving,
      scan,
      scanLoading,
      selection,
      setContrast,
      setExcludedCellsForCurrentPosition,
      setGrid,
      setPatternZoomLocked,
      setSelection,
      setSource,
      setToolMode,
      setVariationExcludeThreshold,
      skipExistingCrop,
      source,
      status,
      toolMode,
      variationExclude,
      variationExcludeLoading,
      variationExcludePreview,
      visibleCounts,
      workspacePath,
    ],
  );
}
