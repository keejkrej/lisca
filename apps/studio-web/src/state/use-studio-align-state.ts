import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  FrameRequest,
  FrameResult,
  WorkspaceScan,
} from "@lisca/contracts";
import {
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  enumerateVisibleAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { studioClient, toErrorMessage } from "../api/studio-client";
import {
  useAutoExcludePreviewMutation,
  useLoadAlignStateQuery,
  useScanSourceQuery,
} from "../api/studio-queries";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import { alignStateFromCurrent, buildBboxCsv } from "../utils/studio-align-output";
import { mergeStudioExcludedCells } from "../utils/studio-align-selection";
import { lockedStudioSelection, studioMaskChannel, toStudioSource } from "../utils/studio-source";
import {
  savedAlignStateKey,
  sourceKey,
  useStudioAlignStore,
  type ExcludedByPosition,
} from "./studio-align-store";
import { useStudioStore } from "./studio-store";

const emptyExcludedCells: AlignGridCellCoord[] = [];

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
  excludedCellsByPosition: ExcludedByPosition;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  currentExcludedCells: AlignGridCellCoord[];
  visibleCounts: { included: number; excluded: number };
  saving: boolean;
  status: string | null;
  canGoBack: boolean;
  goBack: () => void;
  saveAndAdvance: () => Promise<boolean>;
  autoExclude: () => Promise<void>;
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
    error,
    setError,
    status,
    setStatus,
    applySourceScan,
    applySavedAlignState,
  } = useStudioAlignStore();
  const frameLoadIdRef = useRef(0);
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
  const alignStateQuery = useLoadAlignStateQuery(workspacePath, lockedSelection, Boolean(scan));
  const autoExcludePreview = useAutoExcludePreviewMutation();

  const currentExcludedCells = useMemo(
    () => excludedCellsByPosition[lockedSelection.pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, lockedSelection.pos],
  );
  const visibleCounts = useMemo(
    () =>
      frame
        ? countVisibleAlignGridCells(frame, grid, currentExcludedCells)
        : { included: 0, excluded: 0 },
    [currentExcludedCells, frame, grid],
  );

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
    if (!workspacePath || alignStateQuery.data === undefined) return;
    const stateKey = savedAlignStateKey(workspacePath, lockedSelection.pos);
    if (appliedAlignStateKey === stateKey) return;
    applySavedAlignState(stateKey, lockedSelection.pos, alignStateQuery.data);
  }, [
    alignStateQuery.data,
    appliedAlignStateKey,
    applySavedAlignState,
    lockedSelection.pos,
    workspacePath,
  ]);

  useEffect(() => {
    if (!alignStateQuery.error) return;
    setError(toErrorMessage(alignStateQuery.error, "Saved align state load failed"));
  }, [alignStateQuery.error, setError]);

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
    const program = loadFrameEffect(studioClient, source, lockedSelection, null).pipe(
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
    return () => abortController.abort();
  }, [lockedSelection, scan, setError, setFrame, setFrameLoading, setStatus, source]);

  const autoExcludeCells = useCallback(async (): Promise<AlignGridCellCoord[]> => {
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

  const saveAndAdvance = useCallback(async () => {
    if (!workspacePath || !frame) return false;
    setSaving(true);
    setError(null);
    try {
      const edgeCells = collectAlignGridEdgeCells(frame, grid);
      const thresholdCells = await autoExcludeCells();
      const finalExcludedCells = mergeStudioExcludedCells(currentExcludedCells, [
        ...edgeCells,
        ...thresholdCells,
      ]);
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      const csv = buildBboxCsv(frame, grid, finalExcludedCells);
      const result = await studioClient.saveBbox(
        workspacePath,
        lockedSelection.pos,
        csv,
        alignStateFromCurrent(grid, finalExcludedCells),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      setStatus(`Saved bbox/Pos${lockedSelection.pos}.csv`);
      const posOptions = scan?.positions ?? [];
      const currentIndex = posOptions.indexOf(lockedSelection.pos);
      const nextPos = currentIndex >= 0 ? posOptions[currentIndex + 1] : null;
      if (nextPos != null) setSelection({ pos: nextPos });
      return true;
    } catch (cause) {
      setError(toErrorMessage(cause, "Save failed"));
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    autoExcludeCells,
    currentExcludedCells,
    frame,
    grid,
    lockedSelection.pos,
    scan,
    setError,
    setExcludedCellsForCurrentPosition,
    setSaving,
    setSelection,
    setStatus,
    workspacePath,
  ]);

  const autoExclude = useCallback(async () => {
    try {
      setStatus("Auto exclude preview");
      const autoExcluded = await autoExcludeCells();
      setExcludedCellsForCurrentPosition(
        mergeStudioExcludedCells(currentExcludedCells, autoExcluded),
      );
      setStatus(`Auto excluded ${autoExcluded.length} cells`);
    } catch (cause) {
      setError(toErrorMessage(cause, "Auto exclude preview failed"));
    }
  }, [
    autoExcludeCells,
    currentExcludedCells,
    setError,
    setExcludedCellsForCurrentPosition,
    setStatus,
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
    excludedCellsByPosition,
    setExcludedCellsForCurrentPosition,
    currentExcludedCells,
    visibleCounts,
    saving,
    status,
    canGoBack,
    goBack,
    saveAndAdvance,
    autoExclude,
  };
}
