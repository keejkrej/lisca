import type {
  AlignGridCellCoord,
  AlignGridShape,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  FrameRequest,
  FrameResult,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import {
  AlignCanvasSurface,
  AlignGrid,
  AlignTools,
  Button,
  ContrastControl,
  FrameNavigation,
  Section,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
  type AlignCanvasPointerEvent,
  type NavigationOption,
} from "@lisca/ui";
import {
  applyAlignGridPointerGesture,
  beginAlignGridPointerGesture,
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  createDefaultAlignGrid,
  degreesToRadians,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  radiansToDegrees,
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
  saveAndAdvance: () => Promise<boolean>;
  autoExclude: () => Promise<void>;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function selectedIndex(values: number[] | undefined, value: number): number {
  return Math.max(0, values?.indexOf(value) ?? 0);
}

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

function toStudioSource(kind: AlignerSource["kind"] | null, path: string): AlignerSource | null {
  const trimmed = path.trim();
  if (!trimmed || !kind) return null;
  return { kind, path: trimmed } as AlignerSource;
}

export function useStudioAlignState(): StudioAlignState {
  const info1 = useStudioStore((state) => state.info1);
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
    () => toStudioSource(dataSourceKind, info1.dataPath),
    [dataSourceKind, info1.dataPath],
  );
  const activeWorkspacePath = info1.saveTo.trim() || null;
  const activeSourceKey = sourceKey(source);
  const scanQuery = useScanSourceQuery(source);
  const alignStateQuery = useLoadAlignStateQuery(workspacePath, selection, Boolean(scan));
  const autoExcludePreview = useAutoExcludePreviewMutation();

  const currentExcludedCells = useMemo(
    () => excludedCellsByPosition[selection.pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, selection.pos],
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
    const program = loadFrameEffect(studioClient, source, selection, contrast).pipe(
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
  }, [contrast, scan, selection, setError, setFrame, setFrameLoading, setStatus, source]);

  const autoExcludeCells = useCallback(async (): Promise<AlignGridCellCoord[]> => {
    if (!source || !frame) return [];
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return [];
    const preview = await autoExcludePreview.mutateAsync({ source, selection, cells });
    return preview.cellScores
      .filter((cell) => cell.score <= preview.threshold)
      .map(({ i, j }) => ({ i, j }));
  }, [autoExcludePreview, frame, grid, selection, source]);

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
        selection.pos,
        csv,
        alignStateFromCurrent(grid, finalExcludedCells),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      setStatus(`Saved bbox/Pos${selection.pos}.csv`);
      const posOptions = scan?.positions ?? [];
      const currentIndex = posOptions.indexOf(selection.pos);
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
    scan,
    selection.pos,
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
    status,
    saveAndAdvance,
    autoExclude,
  };
}

function AlignFrameNavigation({ state }: { state: StudioAlignState }) {
  const positionOptions = useMemo(
    () => toNavigationOptions(state.scan?.positions ?? []),
    [state.scan],
  );
  const channelOptions = useMemo(
    () => toNavigationOptions(state.scan?.channels ?? []),
    [state.scan],
  );
  const timeIndex = selectedIndex(state.scan?.times, state.selection.time);
  const zIndex = selectedIndex(state.scan?.zSlices, state.selection.z);
  const timeMax = Math.max(0, (state.scan?.times.length ?? 1) - 1);
  const zMax = Math.max(0, (state.scan?.zSlices.length ?? 1) - 1);
  const posIndex = findNavigationOptionIndex(positionOptions, state.selection.pos);
  const chIndex = findNavigationOptionIndex(channelOptions, state.selection.channel);
  const disabled = !state.scan;

  return (
    <FrameNavigation
      channel={{
        value: state.selection.channel,
        options: channelOptions,
        disabled,
        onChange: (channel) => state.setSelection({ channel }),
        previousDisabled: disabled || chIndex <= 0,
        nextDisabled: disabled || chIndex >= channelOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions, state.selection.channel, -1);
          if (next != null) state.setSelection({ channel: next });
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions, state.selection.channel, 1);
          if (next != null) state.setSelection({ channel: next });
        },
      }}
      position={{
        value: state.selection.pos,
        options: positionOptions,
        disabled,
        onChange: (pos) => state.setSelection({ pos }),
        previousDisabled: disabled || posIndex <= 0,
        nextDisabled: disabled || posIndex >= positionOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions, state.selection.pos, -1);
          if (next != null) state.setSelection({ pos: next });
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions, state.selection.pos, 1);
          if (next != null) state.setSelection({ pos: next });
        },
      }}
      timepoint={{
        value: timeIndex,
        min: 0,
        max: timeMax,
        step: 1,
        disabled: disabled || timeMax <= 0,
        onCommit: (i) =>
          state.setSelection({ time: state.scan?.times[clamp(Math.round(i), 0, timeMax)] ?? 0 }),
        previousDisabled: disabled || timeIndex <= 0,
        nextDisabled: disabled || timeIndex >= timeMax,
        onPrevious: () =>
          state.setSelection({ time: state.scan?.times[Math.max(0, timeIndex - 1)] ?? 0 }),
        onNext: () =>
          state.setSelection({ time: state.scan?.times[Math.min(timeMax, timeIndex + 1)] ?? 0 }),
      }}
      zPlane={{
        value: zIndex,
        min: 0,
        max: zMax,
        step: 1,
        disabled: disabled || zMax <= 0,
        onCommit: (i) =>
          state.setSelection({ z: state.scan?.zSlices[clamp(Math.round(i), 0, zMax)] ?? 0 }),
        previousDisabled: disabled || zIndex <= 0,
        nextDisabled: disabled || zIndex >= zMax,
        onPrevious: () =>
          state.setSelection({ z: state.scan?.zSlices[Math.max(0, zIndex - 1)] ?? 0 }),
        onNext: () =>
          state.setSelection({ z: state.scan?.zSlices[Math.min(zMax, zIndex + 1)] ?? 0 }),
      }}
    />
  );
}

export function StudioAlignLeftPanel({ state }: { state: StudioAlignState }) {
  const domain = state.frame?.contrastDomain ?? { min: 0, max: 255 };
  const value = state.contrast ??
    state.frame?.appliedContrast ?? { min: domain.min, max: domain.max };
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <AlignFrameNavigation state={state} />
      <ContrastControl
        autoRangeDisabled={!state.frame}
        disabled={!state.frame}
        domainMax={domain.max}
        domainMin={domain.min}
        maxValue={value.max}
        minValue={value.min}
        sectionClassName="min-h-0 shrink-0"
        onAutoRange={() => state.setContrast(null)}
        onMaxCommit={(max) => state.setContrast({ min: value.min, max })}
        onMinCommit={(min) => state.setContrast({ min, max: value.max })}
      />
    </div>
  );
}

export function StudioAlignBottomPanel({ state }: { state: StudioAlignState }) {
  const canSave = Boolean(state.workspacePath && state.frame);
  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <AlignTools
        mode={state.toolMode}
        sectionClassName="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        sectionContentClassName="flex min-h-0 flex-1 flex-col"
        onModeChange={state.setToolMode}
      />
      <Section
        className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        contentClassName="flex min-h-0 flex-col gap-2"
        title="Save"
      >
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <OutputPathField value={`bbox/Pos${state.selection.pos}.csv`} />
          <OutputPathField value={`align/Pos${state.selection.pos}.json`} />
        </div>
        <Button
          className="w-full justify-center"
          disabled={!canSave || state.saving}
          loading={state.saving}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.saveAndAdvance()}
        >
          Save and next
        </Button>
      </Section>
    </div>
  );
}

function OutputPathField({ value }: { value: string }) {
  return (
    <div
      aria-label={`Output path ${value}`}
      className="min-w-0 truncate rounded-md border border-border bg-muted/20 px-2 py-1.5 font-mono text-xs text-foreground"
      title={value}
    >
      {value}
    </div>
  );
}

export function StudioAlignRightPanel({ state }: { state: StudioAlignState }) {
  const shapeOptions = useMemo<NavigationOption<AlignGridShape>[]>(
    () => [
      { label: "Rectangle", value: "rect" },
      { label: "Hexagon", value: "hex" },
    ],
    [],
  );
  const disabled = !state.frame;
  const updateGrid = (patch: Partial<AlignGridState>) => {
    if (disabled) return;
    state.setGrid((grid) => ({ ...grid, ...patch }));
  };
  const visibleCells = useMemo(
    () =>
      state.frame
        ? enumerateVisibleAlignGridCells(state.frame, state.grid).map(({ i, j }) => ({ i, j }))
        : [],
    [state.frame, state.grid],
  );

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
      <AlignGrid
        offsetX={state.grid.tx}
        offsetY={state.grid.ty}
        onOffsetXChange={(tx) => updateGrid({ tx })}
        onOffsetYChange={(ty) => updateGrid({ ty })}
        onOverlayOpacityChange={(opacity) => updateGrid({ opacity })}
        onOverlayVisibleChange={(enabled) => updateGrid({ enabled })}
        onPatternHeightChange={(cellHeight) => updateGrid({ cellHeight })}
        onPatternWidthChange={(cellWidth) => updateGrid({ cellWidth })}
        onReset={() => !disabled && state.setGrid({ ...createDefaultAlignGrid(), enabled: true })}
        onRotationDegreesChange={(degrees) => updateGrid({ rotation: degreesToRadians(degrees) })}
        onShapeChange={(shape) => updateGrid({ shape })}
        onVectorAChange={(spacingA) => updateGrid({ spacingA })}
        onVectorBChange={(spacingB) => updateGrid({ spacingB })}
        overlayOpacity={state.grid.opacity}
        overlayVisible={state.grid.enabled}
        patternHeight={state.grid.cellHeight}
        patternMin={1}
        patternWidth={state.grid.cellWidth}
        rotationDegrees={radiansToDegrees(state.grid.rotation)}
        shape={state.grid.shape}
        shapeOptions={shapeOptions}
        vectorA={state.grid.spacingA}
        vectorB={state.grid.spacingB}
        vectorMin={1}
      />
      <Section contentClassName="flex min-h-0 flex-col gap-2 overflow-auto" title="Selection">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
            <div className="text-muted-foreground text-xs">Included cells</div>
            <div className="mt-1 font-medium tabular-nums">{state.visibleCounts.included}</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
            <div className="text-muted-foreground text-xs">Excluded cells</div>
            <div className="mt-1 font-medium tabular-nums">{state.visibleCounts.excluded}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={disabled || visibleCells.length === 0}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => state.setExcludedCellsForCurrentPosition(visibleCells)}
          >
            Exclude all
          </Button>
          <Button
            disabled={disabled || !state.frame}
            size="sm"
            type="button"
            variant="outline"
            onClick={() =>
              state.frame &&
              state.setExcludedCellsForCurrentPosition(
                mergeExcludedAlignGridCells(
                  state.currentExcludedCells,
                  collectAlignGridEdgeCells(state.frame, state.grid),
                ),
              )
            }
          >
            Exclude edge
          </Button>
        </div>
        <Button
          disabled={disabled || visibleCells.length === 0}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.autoExclude()}
        >
          Auto exclude
        </Button>
        <Button
          disabled={disabled || state.currentExcludedCells.length === 0}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => state.setExcludedCellsForCurrentPosition([])}
        >
          Reset
        </Button>
      </Section>
    </div>
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
  const activeStatus = state.frameLoading
    ? "Loading frame"
    : state.scanLoading
      ? "Scanning source"
      : state.status;
  const messages = useMemo(() => {
    const items = [];
    if (state.error) items.push({ text: state.error, tone: "error" as const });
    else if (activeStatus) items.push({ text: activeStatus });
    return items;
  }, [activeStatus, state.error]);
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
        onVirtualPointerCancel={handlePointerEnd}
        onVirtualPointerDown={handlePointerDown}
        onVirtualPointerMove={handlePointerMove}
        onVirtualPointerUp={handlePointerEnd}
      />
    </div>
  );
}
