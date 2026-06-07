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
import { cropPositionsAfterSkip, runCropRoi } from "@lisca/client/align-session";
import { useAlignSessionCore } from "@lisca/client/align-session/react";
import { useCanvasResourceTransaction } from "@lisca/ui/features";;
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
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAtom, useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { studioClient, toErrorMessage } from "../api/studio-port";
import { studioNavigateWithTransition } from "../navigation/use-studio-navigate";
import {
  autoExcludePreviewAtom,
  scanIdleAtom,
  scanSourceAtom,
} from "../atoms/studio-query-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import { runClientEffect } from "@lisca/client/runtime";
import { lockedStudioSelection, studioMaskChannel, toStudioSource } from "../utils/studio-source";
import {
  collectAssayPositions,
  filterScanPositionsForAssay,
} from "../utils/sample-positions";
import {
  savedAlignStateKey,
  sourceKey,
  studioAlignUiActions,
  studioAlignUiAtom,
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
  alignPositions: number[];
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
  const [ui, setUi] = useAtom(studioAlignUiAtom);
  const {
    source,
    workspacePath,
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
    error,
    status,
  } = ui;

  const setWorkspacePath = useCallback(
    (path: string | null) => studioAlignUiActions.setWorkspacePath(setUi, path),
    [setUi],
  );
  const setSource = useCallback(
    (next: AlignerSource | null) => studioAlignUiActions.setSource(setUi, next),
    [setUi],
  );
  const setSelection = useCallback(
    (patch: Partial<FrameRequest>) => studioAlignUiActions.setSelection(setUi, patch),
    [setUi],
  );
  const setContrast = useCallback(
    (next: ContrastWindow | null) => studioAlignUiActions.setContrast(setUi, next),
    [setUi],
  );
  const setFrame = useCallback(
    (next: FrameResult | null) => studioAlignUiActions.setFrame(setUi, next),
    [setUi],
  );
  const setGrid = useCallback(
    (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) =>
      studioAlignUiActions.setGrid(setUi, next),
    [setUi],
  );
  const setToolMode = useCallback(
    (mode: AlignGridToolMode) => studioAlignUiActions.setToolMode(setUi, mode),
    [setUi],
  );
  const setPatternZoomLocked = useCallback(
    (locked: boolean) => studioAlignUiActions.setPatternZoomLocked(setUi, locked),
    [setUi],
  );
  const setExcludedCellsForCurrentPosition = useCallback(
    (cells: Iterable<AlignGridCellCoord>) =>
      studioAlignUiActions.setExcludedCellsForCurrentPosition(setUi, cells),
    [setUi],
  );
  const setFrameLoading = useCallback(
    (loading: boolean) => studioAlignUiActions.setFrameLoading(setUi, loading),
    [setUi],
  );
  const setSaving = useCallback(
    (next: boolean) => studioAlignUiActions.setSaving(setUi, next),
    [setUi],
  );
  const setError = useCallback(
    (next: string | null) => studioAlignUiActions.setError(setUi, next),
    [setUi],
  );
  const setStatus = useCallback(
    (next: string | null) => studioAlignUiActions.setStatus(setUi, next),
    [setUi],
  );
  const applySourceScan = useCallback(
    (nextSourceKey: string, nextScan: WorkspaceScan) =>
      studioAlignUiActions.applySourceScan(setUi, nextSourceKey, nextScan),
    [setUi],
  );
  const applyLoadedFrame = useCallback(
    (
      loadedSelection: FrameRequest,
      nextFrame: FrameResult,
      savedAlignState: { stateKey: string; pos: number; saved: SavedAlignState | null } | null,
    ) => studioAlignUiActions.applyLoadedFrame(setUi, loadedSelection, nextFrame, savedAlignState),
    [setUi],
  );
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
  const maskChannel = useMemo(() => studioMaskChannel(info3), [info3]);
  const assayPositions = useMemo(() => collectAssayPositions(info3), [info3]);
  const alignPositions = useMemo(() => {
    if (!scan) return [];
    return filterScanPositionsForAssay(scan.positions, assayPositions);
  }, [assayPositions, scan]);
  const lockedSelection = useMemo(
    () =>
      scan
        ? lockedStudioSelection(scan, selection, maskChannel, alignPositions)
        : selection,
    [alignPositions, maskChannel, scan, selection],
  );
  const activeSourceKey = sourceKey(source);
  const scanResult = useAtomValue(
    activeSourceKey ? scanSourceAtom(activeSourceKey) : scanIdleAtom,
  );
  const runAutoExcludePreview = useAtomSet(autoExcludePreviewAtom, { mode: "promise" });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const {
    meta: { scanLoading },
    derived: { currentExcludedCells, displayedExcludedCells, visibleCounts },
  } = useAlignSessionCore({
    ui,
    setUi,
    actions: studioAlignUiActions,
    scan: { scanResult, activeSourceKey },
    toErrorMessage,
    effectiveSelection: lockedSelection,
  });
  const cropping = cropProgress != null && !isDoneCropStatus(cropProgress.status);

  useEffect(() => {
    setWorkspacePath(activeWorkspacePath);
  }, [activeWorkspacePath, setWorkspacePath]);

  useEffect(() => {
    setSource(activeSource);
  }, [activeSource, setSource]);

  useEffect(() => {
    if (!scan) return;
    if (alignPositions.length === 0) {
      setError("No assay positions found in source scan — check position ranges in basic info");
      return;
    }
    const skipped = assayPositions.length - alignPositions.length;
    if (skipped > 0) {
      setStatus(`${skipped} assay position(s) not found in source scan`);
    }
  }, [alignPositions, assayPositions.length, scan, setError, setStatus]);

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
    if (!source || !scan || alignPositions.length === 0) {
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
      load: (signal) =>
        runClientEffect(
          Effect.all([
            loadFrameEffect(studioClient, source, lockedSelection, null),
            workspacePath
              ? studioClient.loadAlignState(workspacePath, lockedSelection.pos)
              : Effect.succeed(null as SavedAlignState | null),
          ]),
          { signal },
        ),
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
    scan,
    setError,
    setFrame,
    setFrameLoading,
    setStatus,
    source,
    workspacePath,
    alignPositions.length,
  ]);

  const variationExcludeCells = useCallback(async (): Promise<AlignGridCellCoord[]> => {
    if (!source || !frame) return [];
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return [];
    const preview = await runAutoExcludePreview({
      source,
      selection: lockedSelection,
      cells,
    });
    return preview.cellScores
      .filter((cell) => cell.score <= preview.threshold)
      .map(({ i, j }) => ({ i, j }));
  }, [frame, grid, lockedSelection, runAutoExcludePreview, source]);

  const positionIndex = useMemo(
    () => alignPositions.indexOf(lockedSelection.pos),
    [alignPositions, lockedSelection.pos],
  );
  const canGoBack = positionIndex > 0;
  const goBack = useCallback(() => {
    if (saving || positionIndex <= 0) return;
    setSelection({ pos: alignPositions[positionIndex - 1] });
  }, [alignPositions, positionIndex, saving, setSelection]);

  const resetCurrent = useCallback(() => {
    if (saving) return;
    setGrid({ ...createDefaultAlignGrid(), enabled: true });
    setExcludedCellsForCurrentPosition([]);
    setStatus(`Reset Pos${lockedSelection.pos}`);
  }, [lockedSelection.pos, saving, setExcludedCellsForCurrentPosition, setGrid, setStatus]);

  const goToFirstUnaligned = useCallback(async () => {
    if (!workspacePath || alignPositions.length === 0 || saving || findingFirstUnaligned) return;
    setFindingFirstUnaligned(true);
    setError(null);
    try {
      setStatus("Finding jump target");
      const savedPositions = new Set(
        await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
      );
      const firstUnaligned = alignPositions.find((pos) => !savedPositions.has(pos));
      if (firstUnaligned == null) {
        const lastPos = alignPositions.at(-1);
        if (lastPos == null) {
          setStatus("No positions in assay scope");
          return;
        }
        setSelection({ pos: lastPos });
        setStatus(`Jumped to Pos${lastPos}`);
        return;
      }
      setSelection({ pos: firstUnaligned });
      setStatus(`Jumped to Pos${firstUnaligned}`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Saved position scan failed"));
    } finally {
      setFindingFirstUnaligned(false);
    }
  }, [
    alignPositions,
    findingFirstUnaligned,
    saving,
    setError,
    setSelection,
    setStatus,
    workspacePath,
  ]);

  const advanceToNextPosition = useCallback(() => {
    const currentIndex = alignPositions.indexOf(lockedSelection.pos);
    const nextPos = currentIndex >= 0 ? alignPositions[currentIndex + 1] : null;
    if (nextPos == null) return false;
    setSelection({ pos: nextPos });
    return true;
  }, [alignPositions, lockedSelection.pos, setSelection]);

  const runCrop = useCallback(
    async (positions: number[], overwrite: boolean) => {
      if (!workspacePath || !source || positions.length === 0) return;
      const requestId = `studio-crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cropRequestIdRef.current = requestId;
      setError(null);
      await runCropRoi({
        client: studioClient,
        request: { requestId, workspacePath, source, positions, overwrite, outputFormat: "tiff" },
        onProgress: setCropProgress,
        onError: setError,
        onCompleted: (progress) => {
          setStatus(progress.message ?? "Crop completed");
          studioNavigateWithTransition(navigate, pathname, "/annotate");
        },
        toErrorMessage,
      });
    },
    [navigate, pathname, setError, setStatus, source, workspacePath],
  );

  const cropBatchWithOverwriteCheck = useCallback(
    async (positions: number[]) => {
      if (!workspacePath || positions.length === 0) return;
      const existing = await runClientEffect(
        Effect.all(
          positions.map((pos) =>
            studioClient
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
        setCropConfirm({ positions, existingPositions: existing });
        return;
      }
      await runCrop(positions, false);
    },
    [runCrop, workspacePath],
  );

  const maybeCropWhenAllPositionsSaved = useCallback(async () => {
    if (!workspacePath || alignPositions.length === 0) return;
    const savedPositions = new Set(
      await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
    );
    const allPositionsSaved = alignPositions.every((pos) => savedPositions.has(pos));
    if (!allPositionsSaved) return;
    setCropStartConfirm({ positions: alignPositions });
  }, [alignPositions, workspacePath]);

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
      studioNavigateWithTransition(navigate, pathname, "/annotate");
      return;
    }
    void runCrop(remaining, false);
  }, [cropConfirm, navigate, pathname, runCrop, setStatus]);

  const cancelCropConfirm = useCallback(() => {
    setCropConfirm(null);
  }, []);

  const cancelCrop = useCallback(async () => {
    const requestId = cropRequestIdRef.current;
    if (!requestId) return;
    setCropProgress(await runClientEffect(studioClient.cancelCropRoi(requestId)));
  }, []);

  const saveAndAdvance = useCallback(async () => {
    if (!workspacePath || !frame) return false;
    const edgeCells = collectAlignGridEdgeCells(frame, grid);
    const thresholdCells = await variationExcludeCells();
    const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
      ...edgeCells,
      ...thresholdCells,
    ]);
    const { included } = countVisibleAlignGridCells(frame, grid, finalExcludedCells);
    if (included === 0) {
      setError("All grid cells are excluded — adjust exclusions before saving.");
      return false;
    }
    setSaving(true);
    setError(null);
    let advanced = false;
    try {
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      const csv = buildBboxCsv(frame, grid, finalExcludedCells);
      const alignState = alignStateFromCurrent(grid, finalExcludedCells);
      const result = await runClientEffect(
        studioClient.saveBbox(workspacePath, lockedSelection.pos, csv, alignState),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      setStatus(`Saved bbox/Pos${lockedSelection.pos}.csv`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Save failed"));
      return false;
    } finally {
      setSaving(false);
    }

    advanced = advanceToNextPosition();
    if (!advanced) {
      await maybeCropWhenAllPositionsSaved();
      return true;
    }
    await delay(nextExclusionPreviewMs);
    return true;
  }, [
    advanceToNextPosition,
    currentExcludedCells,
    frame,
    grid,
    lockedSelection.pos,
    maybeCropWhenAllPositionsSaved,
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
      const edgeCells = collectAlignGridEdgeCells(frame, grid);
      const variationCells = await variationExcludeCells();
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

  return useMemo(
    () => ({
      workspacePath,
      source,
      scan,
      alignPositions,
      scanLoading,
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
    }),
    [
      alignPositions,
      autoExclude,
      cancelCrop,
      cancelCropConfirm,
      cancelCropStartConfirm,
      canGoBack,
      confirmCropOverwrite,
      contrast,
      cropConfirm,
      cropProgress,
      cropStartConfirm,
      cropping,
      currentExcludedCells,
      displayedExcludedCells,
      error,
      excludedCellsByPosition,
      findingFirstUnaligned,
      frame,
      frameLoading,
      goBack,
      goToFirstUnaligned,
      grid,
      lockedSelection,
      patternZoomLocked,
      resetCurrent,
      saveAndAdvance,
      saving,
      scan,
      scanLoading,
      setContrast,
      setExcludedCellsForCurrentPosition,
      setGrid,
      setPatternZoomLocked,
      setSelection,
      setToolMode,
      skipExistingCrop,
      source,
      startConfirmedCrop,
      status,
      toolMode,
      visibleCounts,
      workspacePath,
    ],
  );
}
