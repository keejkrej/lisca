import {
  type AlignGridCellCoord,
  type AlignGridState,
  type AlignerSource,
  type ContrastWindow,
  type FrameRequest,
  type FrameResult,
  type SavedAlignState,
  type StudioBasicInfoStep1,
  type StudioBasicInfoStep3,
  type WorkspaceScan,
} from "@lisca/contracts";
import {
  AlignCanvasSurface,
  AlignTools,
  useCanvasTransientStatus,
  type AlignCanvasPointerEvent,
} from "@lisca/ui";
import {
  applyAlignGridPointerGesture,
  beginAlignGridPointerGesture,
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridPointerGestureSession,
  type AlignGridToolMode,
} from "@lisca/utils";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { studioClient, toErrorMessage } from "../api/studio-client";
import {
  useAutoExcludePreviewMutation,
  useLoadAlignStateQuery,
  useScanSourceQuery,
} from "../api/studio-queries";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import {
  savedAlignStateKey,
  sourceKey,
  useStudioAlignStore,
  type ExcludedByPosition,
} from "../state/studio-align-store";
import { useStudioStore } from "../state/studio-store";

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

function buildBboxCsv(
  frame: FrameResult,
  grid: AlignGridState,
  excludedCells: readonly AlignGridCellCoord[],
): string {
  const excluded = new Set(excludedCells.map((cell) => `${cell.i}:${cell.j}`));
  const rows = enumerateVisibleAlignGridCells(frame, grid)
    .filter((cell) => !excluded.has(`${cell.i}:${cell.j}`))
    .map((cell, roi) => [roi, cell.x, cell.y, cell.w, cell.h, cell.i, cell.j].join(","));
  return ["roi,x,y,w,h,i,j", ...rows].join("\n");
}

function alignStateFromCurrent(
  grid: AlignGridState,
  currentExcludedCells: AlignGridCellCoord[],
): SavedAlignState {
  return { grid, excludedCells: currentExcludedCells };
}

function toStudioSource(
  kind: AlignerSource["kind"] | null,
  info1: StudioBasicInfoStep1,
): AlignerSource | null {
  const trimmed = info1.dataPath.trim();
  if (!trimmed || !kind) return null;
  if (kind === "folder") {
    return {
      kind,
      path: trimmed,
      subfolderTemplate: info1.folderSubfolderTemplate.trim(),
      filenameTemplate: info1.folderFilenameTemplate.trim(),
    };
  }
  return { kind, path: trimmed } as AlignerSource;
}

function parseChannel(value: string): number | null {
  const channel = Number(value.trim());
  return Number.isInteger(channel) && channel >= 0 ? channel : null;
}

function studioMaskChannel(info3: StudioBasicInfoStep3): number {
  const rows = info3.samplesBySlide[info3.selectedSlideId];
  for (const row of rows) {
    const channel = parseChannel(row.maskChannel);
    if (channel != null) return channel;
  }
  return 0;
}

function lastOrZero(values: number[] | undefined): number {
  return values?.[Math.max(0, values.length - 1)] ?? 0;
}

function firstOrZero(values: number[] | undefined): number {
  return values?.[0] ?? 0;
}

function lockedStudioSelection(
  scan: WorkspaceScan,
  current: FrameRequest,
  maskChannel: number,
): FrameRequest {
  const position = scan.positions.includes(current.pos) ? current.pos : firstOrZero(scan.positions);
  return {
    pos: position,
    channel: maskChannel,
    time: lastOrZero(scan.times),
    z: 0,
  };
}

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
      const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
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
        mergeExcludedAlignGridCells(currentExcludedCells, autoExcluded),
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

export function StudioAlignBottomPanel({ state }: { state: StudioAlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      sectionClassName="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      sectionContentClassName="flex min-h-0 flex-1 flex-col"
      onModeChange={state.setToolMode}
    />
  );
}

function useAlignCanvasHandlers(state: StudioAlignState) {
  const { grid, setGrid, toolMode } = state;
  const gestureRef = useRef<AlignGridPointerGestureSession | null>(null);
  const previewGridRef = useRef<AlignGridState | null>(null);
  const [previewGrid, setPreviewGridState] = useState<AlignGridState | null>(null);
  const setPreviewGrid = useCallback((next: AlignGridState | null) => {
    previewGridRef.current = next;
    setPreviewGridState(next);
  }, []);
  const handlePointerDown = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (!event.viewport || !grid.enabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) {
        event.preventDefault();
        return;
      }
      const session = beginAlignGridPointerGesture(grid, event, toolMode);
      if (!session) return;
      event.preventDefault();
      event.capturePointer();
      gestureRef.current = session;
      setPreviewGrid(null);
    },
    [grid, setPreviewGrid, toolMode],
  );
  const handlePointerMove = useCallback(
    (event: AlignCanvasPointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || !event.viewport || gesture.pointerId !== event.pointerId) return;
      event.preventDefault();
      setPreviewGrid(applyAlignGridPointerGesture(gesture, event, event.viewport));
    },
    [setPreviewGrid],
  );
  const handlePointerEnd = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (gestureRef.current?.pointerId !== event.pointerId) return;
      gestureRef.current = null;
      const previewGrid = previewGridRef.current;
      if (previewGrid) setGrid(previewGrid);
      setPreviewGrid(null);
      event.releasePointer();
    },
    [setGrid, setPreviewGrid],
  );
  return { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid };
}

function cursorForAlignTool(toolMode: AlignGridToolMode, gridEnabled: boolean, dragging: boolean) {
  if (!gridEnabled) return "default";
  if (dragging) return "grabbing";
  if (toolMode === "pan") return "grab";
  if (toolMode === "rotate") return "crosshair";
  return "zoom-in";
}

export function StudioAlignMainPanel({ state }: { state: StudioAlignState }) {
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasHandlers(state);
  const visibleStatus = useCanvasTransientStatus(state.status);
  const activeToastStatus = state.frameLoading
    ? "Loading frame"
    : state.scanLoading
      ? "Scanning source"
      : visibleStatus;
  const positionIndex = state.scan?.positions.indexOf(state.selection.pos) ?? -1;
  const positionCount = state.scan?.positions.length ?? 0;
  const positionMessage =
    positionIndex >= 0 && positionCount > 0 ? `Pos ${positionIndex + 1}/${positionCount}` : null;
  const messages = useMemo(() => {
    if (!positionMessage) return [];
    return [{ text: positionMessage }];
  }, [positionMessage]);
  const toasts = useMemo(() => {
    if (state.error) return [{ text: state.error, tone: "error" as const }];
    if (activeToastStatus) return [{ text: activeToastStatus }];
    return [];
  }, [activeToastStatus, state.error]);
  const emptyText = !state.workspacePath
    ? "Choose a save folder on Info."
    : !state.source
      ? "Choose a data source on Info."
      : state.scanLoading
        ? "Scanning source..."
        : "No frame loaded.";

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <AlignCanvasSurface
        className="min-h-0 flex-1"
        cursor={cursorForAlignTool(state.toolMode, state.grid.enabled, previewGrid != null)}
        emptyText={emptyText}
        excludedCells={state.currentExcludedCells}
        frame={state.frame}
        grid={state.grid}
        loading={state.scanLoading || state.frameLoading}
        messages={messages}
        previewGrid={previewGrid}
        toasts={toasts}
        onVirtualPointerCancel={handlePointerEnd}
        onVirtualPointerDown={handlePointerDown}
        onVirtualPointerMove={handlePointerMove}
        onVirtualPointerUp={handlePointerEnd}
      />
    </div>
  );
}
