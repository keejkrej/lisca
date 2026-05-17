import type {
  AlignGridCellCoord,
  AlignGridShape,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  CropRoiProgress,
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
  Spinner,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
  useShellWorkspace,
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

import {
  alignerClient,
  toErrorMessage,
  useAutoExcludePreviewMutation,
  useLoadAlignStateQuery,
  useSavedBboxPositionsQuery,
  useScanSourceQuery,
} from "../api/aligner-queries";
import { effectErrorMessage, loadFrameEffect } from "../effects/frame-loader";
import {
  savedAlignStateKey,
  sourceKey,
  useAlignerStore,
  type ExcludedByPosition,
} from "../state/aligner-store";
import type { RouteId } from "../types";

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
  status: string | null;
  saveCurrent: () => Promise<boolean>;
  cropCurrent: () => Promise<void>;
  cropBatch: () => Promise<void>;
  cancelCrop: () => Promise<void>;
  autoExclude: () => Promise<void>;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function selectedIndex(values: number[] | undefined, value: number): number {
  return Math.max(0, values?.indexOf(value) ?? 0);
}

function isDoneCropStatus(status: CropRoiProgress["status"]) {
  return status === "completed" || status === "cancelled" || status === "error";
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
  state: Pick<AlignState, "grid" | "currentExcludedCells">,
): SavedAlignState {
  return {
    grid: state.grid,
    excludedCells: state.currentExcludedCells,
  };
}

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
        alignStateFromCurrent({ grid, currentExcludedCells }),
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
      const stop = alignerClient.onCropRoiProgress(requestId, (progress) => {
        setCropProgress(progress);
        if (isDoneCropStatus(progress.status)) {
          if (progress.status === "error") setError(progress.error ?? "Crop failed");
          stop();
        }
      });
      try {
        await alignerClient.cropRoi({
          requestId,
          workspacePath,
          source,
          positions,
          overwrite,
          outputFormat: "tiff",
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
    const overwrite = exists
      ? window.confirm(`roi/Pos${selection.pos} already exists. Overwrite it?`)
      : false;
    if (exists && !overwrite) return;
    await runCrop([selection.pos], overwrite);
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
    const overwrite =
      existing.length > 0
        ? window.confirm(`ROI output exists for ${existing.length} position(s). Overwrite them?`)
        : false;
    const positions = overwrite
      ? savedPositions
      : savedPositions.filter((pos) => !existing.includes(pos));
    if (positions.length === 0) return;
    await runCrop(positions, overwrite);
  }, [runCrop, savedPositionsQuery, setError, setStatus, source, workspacePath]);

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
    status,
    saveCurrent,
    cropCurrent,
    cropBatch,
    cancelCrop,
    autoExclude,
  };
}

function AlignFrameNavigation({ state }: { state: AlignState }) {
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
  const disabled = !state.scan || state.cropping;

  return (
    <FrameNavigation
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

export function LeftPanel(props: { routeId: RouteId; alignState?: AlignState }) {
  if (props.routeId !== "align" || !props.alignState) return null;
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <AlignFrameNavigation state={props.alignState} />
      <DockContrastControls state={props.alignState} />
    </div>
  );
}

function DockContrastControls({ state }: { state: AlignState }) {
  const domain = state.frame?.contrastDomain ?? { min: 0, max: 255 };
  const value = state.contrast ??
    state.frame?.appliedContrast ?? { min: domain.min, max: domain.max };
  return (
    <ContrastControl
      aria-label="Contrast"
      autoRangeDisabled={!state.frame || state.cropping}
      disabled={!state.frame || state.cropping}
      domainMax={domain.max}
      domainMin={domain.min}
      maxValue={value.max}
      minValue={value.min}
      role="region"
      sectionClassName="min-h-0 shrink-0"
      sectionContentClassName="flex min-h-0 flex-col overflow-auto"
      onAutoRange={() => state.setContrast(null)}
      onMaxCommit={(max) => state.setContrast({ min: value.min, max })}
      onMinCommit={(min) => state.setContrast({ min, max: value.max })}
    />
  );
}

export function BottomPanel(props: { routeId: RouteId; alignState?: AlignState }) {
  if (props.routeId !== "align" || !props.alignState) return null;
  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <AlignToolSection state={props.alignState} />
      <AlignSaveSection state={props.alignState} />
    </div>
  );
}

function AlignToolSection({ state }: { state: AlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      sectionClassName="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      sectionContentClassName="flex min-h-0 flex-1 flex-col"
      onModeChange={(mode) => {
        if (!state.cropping) state.setToolMode(mode);
      }}
    />
  );
}

function AlignSaveSection({ state }: { state: AlignState }) {
  const pos = state.selection.pos;
  const canSave = Boolean(state.workspacePath && state.frame && !state.cropping);
  const canCrop = Boolean(state.workspacePath && state.source && state.frame && !state.cropping);

  return (
    <Section
      className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      contentClassName="flex min-h-0 flex-col gap-2"
      title="Save"
    >
      <div className="grid min-w-0 grid-cols-3 gap-2">
        <OutputPathField value={`bbox/Pos${pos}.csv`} />
        <OutputPathField value={`align/Pos${pos}.json`} />
        <OutputPathField value={`roi/Pos${pos}`} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          className="w-full justify-center"
          disabled={!canSave || state.saving}
          loading={state.saving}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.saveCurrent()}
        >
          Save
        </Button>
        <Button
          className="w-full justify-center"
          disabled={!canCrop}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.cropCurrent()}
        >
          Crop
        </Button>
        <Button
          className="w-full justify-center"
          disabled={!state.workspacePath || !state.source || state.cropping}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.cropBatch()}
        >
          Batch
        </Button>
      </div>
    </Section>
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

function AlignGridPanel({ state }: { state: AlignState }) {
  const shapeOptions = useMemo<NavigationOption<AlignGridShape>[]>(
    () => [
      { label: "Rectangle", value: "rect" },
      { label: "Hexagon", value: "hex" },
    ],
    [],
  );
  const disabled = state.cropping || !state.frame;
  const updateGrid = (patch: Partial<AlignGridState>) => {
    if (disabled) return;
    state.setGrid((grid) => ({ ...grid, ...patch }));
  };

  return (
    <AlignGrid
      patternHeight={state.grid.cellHeight}
      patternMin={1}
      patternWidth={state.grid.cellWidth}
      offsetX={state.grid.tx}
      offsetY={state.grid.ty}
      onPatternHeightChange={(cellHeight) => updateGrid({ cellHeight })}
      onPatternWidthChange={(cellWidth) => updateGrid({ cellWidth })}
      onOffsetXChange={(tx) => updateGrid({ tx })}
      onOffsetYChange={(ty) => updateGrid({ ty })}
      onOverlayOpacityChange={(opacity) => updateGrid({ opacity })}
      onOverlayVisibleChange={(enabled) => updateGrid({ enabled })}
      onVectorAChange={(spacingA) => updateGrid({ spacingA })}
      onVectorBChange={(spacingB) => updateGrid({ spacingB })}
      onReset={() => !disabled && state.setGrid({ ...createDefaultAlignGrid(), enabled: true })}
      onRotationDegreesChange={(degrees) => updateGrid({ rotation: degreesToRadians(degrees) })}
      onShapeChange={(shape) => updateGrid({ shape })}
      overlayOpacity={state.grid.opacity}
      overlayVisible={state.grid.enabled}
      vectorA={state.grid.spacingA}
      vectorB={state.grid.spacingB}
      vectorMin={1}
      rotationDegrees={radiansToDegrees(state.grid.rotation)}
      shape={state.grid.shape}
      shapeOptions={shapeOptions}
      sectionClassName="min-h-0 shrink-0"
    />
  );
}

function AlignSelectionPanel({ state }: { state: AlignState }) {
  const visibleCells = useMemo(
    () =>
      state.frame
        ? enumerateVisibleAlignGridCells(state.frame, state.grid).map(({ i, j }) => ({ i, j }))
        : [],
    [state.frame, state.grid],
  );
  const hasVisibleCells = visibleCells.length > 0;
  const hasExcludedCells = state.currentExcludedCells.length > 0;
  const disabled = state.cropping || !state.frame;

  return (
    <Section
      className="min-h-0 shrink-0"
      contentClassName="flex min-h-0 flex-col gap-2 overflow-auto"
      title="Selection"
    >
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
      <Button
        className="w-full"
        disabled={disabled || !hasExcludedCells}
        size="sm"
        type="button"
        variant="outline"
        onClick={() => state.setExcludedCellsForCurrentPosition([])}
      >
        Reset
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={disabled || !hasVisibleCells}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => state.setExcludedCellsForCurrentPosition(visibleCells)}
        >
          Exclude all
        </Button>
        <Button
          disabled={disabled || !hasVisibleCells}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => {
            if (!state.frame) return;
            const edgeCells = collectAlignGridEdgeCells(state.frame, state.grid);
            state.setExcludedCellsForCurrentPosition(
              mergeExcludedAlignGridCells(state.currentExcludedCells, edgeCells),
            );
          }}
        >
          Exclude edge
        </Button>
      </div>
      <Button
        className="w-full"
        disabled={disabled || !hasVisibleCells}
        size="sm"
        type="button"
        variant="outline"
        onClick={() => void state.autoExclude()}
      >
        Auto exclude
      </Button>
    </Section>
  );
}

function useAlignCanvasHandlers(state: AlignState) {
  const { cropping, grid, setGrid, toolMode } = state;
  const gestureRef = useRef<AlignGridPointerGestureSession | null>(null);
  const previewGridRef = useRef<AlignGridState | null>(null);
  const [previewGrid, setPreviewGridState] = useState<AlignGridState | null>(null);

  const setPreviewGrid = useCallback((next: AlignGridState | null) => {
    previewGridRef.current = next;
    setPreviewGridState(next);
  }, []);

  const handlePointerDown = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (cropping || !event.viewport || !grid.enabled) return;
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
    [cropping, grid, setPreviewGrid, toolMode],
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

function AlignCanvasPanel({ state }: { state: AlignState }) {
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasHandlers(state);
  const [visibleStatus, setVisibleStatus] = useState<string | null>(state.status);

  useEffect(() => {
    if (!state.status) {
      setVisibleStatus(null);
      return;
    }
    setVisibleStatus(state.status);
    if (state.status === "Scanning source" || state.status === "Loading frame") return;

    const timeoutId = window.setTimeout(() => {
      setVisibleStatus((current) => (current === state.status ? null : current));
    }, 2500);
    return () => window.clearTimeout(timeoutId);
  }, [state.status]);

  const activeStatus = state.frameLoading
    ? "Loading frame"
    : state.scanLoading
      ? "Scanning source"
      : visibleStatus;
  const messages = useMemo(() => {
    const items = [];
    if (state.error) items.push({ text: state.error, tone: "error" as const });
    else if (activeStatus) items.push({ text: activeStatus });
    return items;
  }, [activeStatus, state.error]);

  const emptyText = !state.workspacePath
    ? "Pick a workspace."
    : !state.source
      ? "Pick a source."
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
      <CropProgressModal state={state} />
    </div>
  );
}

function CropProgressModal({ state }: { state: AlignState }) {
  const progress = state.cropProgress;
  if (!progress || isDoneCropStatus(progress.status)) return null;
  const total = Math.max(1, progress.totalRois || progress.totalPositions || 1);
  const done = progress.totalRois ? progress.completedRois : progress.completedPositions;
  const pct = clamp((done / total) * 100, 0, 100);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <Spinner className="size-4" />
          <div className="min-w-0">
            <div className="font-medium text-foreground">Cropping ROI output</div>
            <div className="truncate text-muted-foreground text-sm">
              {progress.message ?? "Working"}
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-muted-foreground text-xs tabular-nums">
          {done} / {total}
        </div>
        <Button
          className="mt-4 w-full justify-center"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.cancelCrop()}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function MainPanel(props: { routeId: RouteId; alignState?: AlignState }) {
  if (props.routeId !== "align" || !props.alignState) return null;
  return <AlignCanvasPanel state={props.alignState} />;
}

export function RightPanel(props: { routeId: RouteId; alignState?: AlignState }) {
  if (props.routeId !== "align" || !props.alignState) return null;
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
      <AlignGridPanel state={props.alignState} />
      <AlignSelectionPanel state={props.alignState} />
    </div>
  );
}
