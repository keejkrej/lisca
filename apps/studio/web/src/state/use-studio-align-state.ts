import type { AlignGridCellCoord, AlignGridState, AlignerSource, ContrastWindow, CropRoiProgress, FrameRequest, SavedAlignState, WorkspaceScan } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { runCropRoi } from "@lisca/client/align-session";
import { useAlignSessionCore } from "@lisca/client/align-session/react";
import { useCanvasResourceTransaction } from "@lisca/ui/features";
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
import { useNavigate } from "@tanstack/react-router";
import { useAtom, useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { useEffect, useRef, useState } from "react";
import { studioClient, toErrorMessage } from "../api/studio-port";
import { studioNavigate } from "../navigation/use-studio-navigate";
import { autoExcludePreviewAtom, scanIdleAtom, scanSourceAtom } from "../atoms/studio-query-atoms";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { isDoneCropStatus } from "@lisca/client/crop-status";
import { runClientEffect } from "@lisca/client/runtime";
import { lockedStudioSelection, studioMaskChannel, toStudioSource } from "@lisca/client/studio/source";
import { collectAssayPositions, filterScanPositionsForAssay } from "@lisca/client/studio/sample-positions";
import {
  savedAlignStateKey,
  sourceKey,
  studioAlignUiActions,
  studioAlignUiAtom,
  type ExcludedByPosition,
} from "./studio-align-store";
import { useStudioStore } from "./studio-store";
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
  visibleCounts: {
    included: number;
    excluded: number;
  };
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
    selection,
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
  const setSelection = (patch: Partial<FrameRequest>) =>
    studioAlignUiActions.setSelection(setUi, patch);
  const setContrast = (next: ContrastWindow | null) =>
    studioAlignUiActions.setContrast(setUi, next);
  const setGrid = (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) =>
    studioAlignUiActions.setGrid(setUi, next);
  const setToolMode = (mode: AlignGridToolMode) => studioAlignUiActions.setToolMode(setUi, mode);
  const setPatternZoomLocked = (locked: boolean) =>
    studioAlignUiActions.setPatternZoomLocked(setUi, locked);
  const setExcludedCellsForCurrentPosition = (cells: Iterable<AlignGridCellCoord>) =>
    studioAlignUiActions.setExcludedCellsForCurrentPosition(setUi, cells);
  const setSaving = (next: boolean) => studioAlignUiActions.setSaving(setUi, next);
  const setError = (next: string | null) => studioAlignUiActions.setError(setUi, next);
  const setStatus = (next: string | null) => studioAlignUiActions.setStatus(setUi, next);
  const [findingFirstUnaligned, setFindingFirstUnaligned] = useState(false);
  const [cropProgress, setCropProgress] = useState<CropRoiProgress | null>(null);
  const [cropStartConfirm, setCropStartConfirm] = useState<CropStartConfirmState | null>(null);
  const [cropConfirm, setCropConfirm] = useState<CropConfirmState | null>(null);
  const cropRequestIdRef = useRef<string | null>(null);
  const loadCanvasResources = useCanvasResourceTransaction();
  const activeSource = toStudioSource(dataSourceKind, info1);
  const activeWorkspacePath = info1.saveTo.trim() || null;
  const maskChannel = studioMaskChannel(info3);
  const assayPositions = collectAssayPositions(info3);
  const alignPositions = (() => {
    if (!scan) return [];
    return filterScanPositionsForAssay(scan.positions, assayPositions);
  })();
  const lockedSelection = scan
    ? lockedStudioSelection(scan, selection, maskChannel, alignPositions)
    : selection;
  const activeSourceKey = sourceKey(source);
  const scanResult = useAtomValue(activeSourceKey ? scanSourceAtom(activeSourceKey) : scanIdleAtom);
  const runAutoExcludePreview = useAtomSet(autoExcludePreviewAtom, {
    mode: "promise",
  });
  const navigate = useNavigate();
  const {
    meta: { scanLoading },
    derived: { currentExcludedCells, displayedExcludedCells, visibleCounts },
  } = useAlignSessionCore({
    ui,
    setUi,
    actions: studioAlignUiActions,
    scan: {
      scanResult,
      activeSourceKey,
    },
    toErrorMessage,
    effectiveSelection: lockedSelection,
  });
  const cropping = cropProgress != null && !isDoneCropStatus(cropProgress.status);
  useEffect(() => {
    studioAlignUiActions.setWorkspacePath(setUi, activeWorkspacePath);
  }, [activeWorkspacePath, setUi]);
  useEffect(() => {
    studioAlignUiActions.setSource(setUi, activeSource);
  }, [activeSource, setUi]);
  useEffect(() => {
    if (!scan) return;
    if (alignPositions.length === 0) {
      studioAlignUiActions.setError(
        setUi,
        "No assay positions found in source scan — check position ranges in basic info",
      );
      return;
    }
    const skipped = assayPositions.length - alignPositions.length;
    if (skipped > 0) {
      studioAlignUiActions.setStatus(
        setUi,
        `${skipped} assay position(s) not found in source scan`,
      );
    }
  }, [alignPositions, assayPositions.length, scan, setUi]);
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
    studioAlignUiActions.setSelection(setUi, lockedSelection);
  }, [lockedSelection, scan, selection, setUi]);
  useEffect(() => {
    if (!source || !scan || alignPositions.length === 0) {
      studioAlignUiActions.setFrameLoading(setUi, false);
      return;
    }
    const alignStateKey = workspacePath
      ? savedAlignStateKey(workspacePath, lockedSelection.pos)
      : null;
    return loadCanvasResources({
      start: () => {
        studioAlignUiActions.setContrast(setUi, null);
        studioAlignUiActions.setFrameLoading(setUi, true);
        studioAlignUiActions.setError(setUi, null);
        studioAlignUiActions.setStatus(setUi, "Loading frame");
      },
      load: (signal) =>
        runClientEffect(
          Effect.all([
            loadFrameEffect(studioClient, source, lockedSelection, null),
            workspacePath
              ? studioClient.loadAlignState(workspacePath, lockedSelection.pos)
              : Effect.succeed(null as SavedAlignState | null),
          ]),
          {
            signal,
          },
        ),
      commit: ([nextFrame, savedAlignState]) => {
        studioAlignUiActions.applyLoadedFrame(
          setUi,
          lockedSelection,
          nextFrame,
          alignStateKey
            ? {
                stateKey: alignStateKey,
                pos: lockedSelection.pos,
                saved: savedAlignState,
              }
            : null,
        );
      },
      reject: (cause) => {
        studioAlignUiActions.setFrame(setUi, null);
        studioAlignUiActions.setError(
          setUi,
          cause instanceof Error && cause.message.startsWith("Frame request failed")
            ? effectErrorMessage(cause)
            : toErrorMessage(cause, "Frame or saved align state load failed"),
        );
      },
      settle: () => studioAlignUiActions.setFrameLoading(setUi, false),
    });
  }, [
    alignPositions.length,
    loadCanvasResources,
    lockedSelection,
    scan,
    setUi,
    source,
    workspacePath,
  ]);
  useEffect(() => {
    if (!contrast || !source || !scan || alignPositions.length === 0) {
      return;
    }
    return loadCanvasResources({
      start: () => {
        studioAlignUiActions.setFrameLoading(setUi, true);
        studioAlignUiActions.setError(setUi, null);
      },
      load: (signal) =>
        runClientEffect(loadFrameEffect(studioClient, source, lockedSelection, contrast), {
          signal,
        }),
      commit: (nextFrame) => {
        studioAlignUiActions.setFrame(setUi, nextFrame);
        studioAlignUiActions.setStatus(setUi, null);
      },
      reject: (cause) => {
        studioAlignUiActions.setError(
          setUi,
          cause instanceof Error && cause.message.startsWith("Frame request failed")
            ? effectErrorMessage(cause)
            : toErrorMessage(cause, "Frame contrast update failed"),
        );
      },
      settle: () => studioAlignUiActions.setFrameLoading(setUi, false),
    });
  }, [
    alignPositions.length,
    contrast,
    loadCanvasResources,
    lockedSelection,
    scan,
    setUi,
    source,
  ]);
  const variationExcludeCells = async (): Promise<AlignGridCellCoord[]> => {
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
      .map(({ i, j }) => ({
        i,
        j,
      }));
  };
  const positionIndex = alignPositions.indexOf(lockedSelection.pos);
  const canGoBack = positionIndex > 0;
  const goBack = () => {
    if (saving || positionIndex <= 0) return;
    setSelection({
      pos: alignPositions[positionIndex - 1],
    });
  };
  const resetCurrent = () => {
    if (saving) return;
    setGrid({
      ...createDefaultAlignGrid(),
      enabled: true,
    });
    setExcludedCellsForCurrentPosition([]);
    setStatus(`Reset Pos${lockedSelection.pos}`);
  };
  const goToFirstUnaligned = async () => {
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
        setSelection({
          pos: lastPos,
        });
        setStatus(`Jumped to Pos${lastPos}`);
        return;
      }
      setSelection({
        pos: firstUnaligned,
      });
      setStatus(`Jumped to Pos${firstUnaligned}`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Saved position scan failed"));
    } finally {
      setFindingFirstUnaligned(false);
    }
  };
  const advanceToNextPosition = () => {
    const currentIndex = alignPositions.indexOf(lockedSelection.pos);
    const nextPos = currentIndex >= 0 ? alignPositions[currentIndex + 1] : null;
    if (nextPos == null) return false;
    setSelection({
      pos: nextPos,
    });
    return true;
  };
  const runCrop = async (positions: number[], overwrite: boolean) => {
    if (!workspacePath || !source || positions.length === 0) return;
    const requestId = `studio-crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cropRequestIdRef.current = requestId;
    setError(null);
    await runCropRoi({
      client: studioClient,
      request: {
        requestId,
        workspacePath,
        source,
        positions,
        overwrite,
        outputFormat: "tiff",
      },
      onProgress: setCropProgress,
      onError: setError,
      onCompleted: (progress) => {
        setStatus(progress.message ?? "Crop completed");
        studioNavigate(navigate, "/annotate");
      },
      toErrorMessage,
    });
  };
  const cropBatchWithOverwriteCheck = async (positions: number[]) => {
    if (!workspacePath || positions.length === 0) return;
    const existing = await runClientEffect(
      Effect.all(
        positions.map((pos) =>
          studioClient.roiPosExists(workspacePath, pos).pipe(
            Effect.map((exists) => ({
              pos,
              exists,
            })),
          ),
        ),
      ).pipe(
        Effect.map((entries) => entries.filter((entry) => entry.exists).map((entry) => entry.pos)),
      ),
    );
    if (existing.length > 0) {
      setCropConfirm({
        positions,
        existingPositions: existing,
      });
      return;
    }
    await runCrop(positions, false);
  };
  const maybeCropWhenAllPositionsSaved = async () => {
    if (!workspacePath || alignPositions.length === 0) return;
    const savedPositions = new Set(
      await runClientEffect(studioClient.listSavedBboxPositions(workspacePath)),
    );
    const allPositionsSaved = alignPositions.every((pos) => savedPositions.has(pos));
    if (!allPositionsSaved) return;
    setCropStartConfirm({
      positions: alignPositions,
    });
  };
  const startConfirmedCrop = () => {
    const next = cropStartConfirm;
    if (!next) return;
    setCropStartConfirm(null);
    void cropBatchWithOverwriteCheck(next.positions);
  };
  const cancelCropStartConfirm = () => {
    setCropStartConfirm(null);
  };
  const confirmCropOverwrite = () => {
    const next = cropConfirm;
    if (!next) return;
    setCropConfirm(null);
    void runCrop(next.positions, true);
  };
  const skipExistingCrop = () => {
    const next = cropConfirm;
    if (!next) return;
    setCropConfirm(null);
    const existing = new Set(next.existingPositions);
    const remaining = next.positions.filter((pos) => !existing.has(pos));
    if (remaining.length === 0) {
      setStatus(`Skipped ${next.existingPositions.length} existing ROI output(s)`);
      studioNavigate(navigate, "/annotate");
      return;
    }
    void runCrop(remaining, false);
  };
  const cancelCropConfirm = () => {
    setCropConfirm(null);
  };
  const cancelCrop = async () => {
    const requestId = cropRequestIdRef.current;
    if (!requestId) return;
    setCropProgress(await runClientEffect(studioClient.cancelCropRoi(requestId)));
  };
  const saveAndAdvance = async () => {
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
  };
  const autoExclude = async () => {
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
  };
  return {
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
  };
}
