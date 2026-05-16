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
  normalizeAlignGridState,
  radiansToDegrees,
  setExcludedAlignGridCellsForPosition,
  type AlignGridPointerGestureSession,
  type AlignGridToolMode,
} from "@lisca/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createAlignerHttpClient } from "../api/aligner-client";
import type { RouteId } from "../types";

type ExcludedByPosition = Record<number, AlignGridCellCoord[]>;

const emptyExcludedCells: AlignGridCellCoord[] = [];
const alignerClient = createAlignerHttpClient("http://127.0.0.1:8765");

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

function firstOrZero(values: number[] | undefined): number {
  return values?.[0] ?? 0;
}

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

function alignStateFromCurrent(state: Pick<AlignState, "grid" | "currentExcludedCells">): SavedAlignState {
  return {
    grid: state.grid,
    excludedCells: state.currentExcludedCells,
  };
}

export function useAlignState(): AlignState {
  const workspace = useShellWorkspace();
  const [source, setSource] = useState<AlignerSource | null>(null);
  const [scan, setScan] = useState<WorkspaceScan | null>(null);
  const [selection, setSelectionRaw] = useState<FrameRequest>({
    pos: 0,
    channel: 0,
    time: 0,
    z: 0,
  });
  const [frame, setFrame] = useState<FrameResult | null>(null);
  const [contrast, setContrast] = useState<ContrastWindow | null>(null);
  const [grid, setGridRaw] = useState(() => normalizeAlignGridState(createDefaultAlignGrid()));
  const [toolMode, setToolMode] = useState<AlignGridToolMode>("pan");
  const [excludedCellsByPosition, setExcludedCellsByPosition] = useState<ExcludedByPosition>({});
  const [scanLoading, setScanLoading] = useState(false);
  const [frameLoading, setFrameLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropProgress, setCropProgress] = useState<CropRoiProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const cropRequestIdRef = useRef<string | null>(null);

  const workspacePath = workspace.workspacePath;
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

  const setSelection = useCallback((patch: Partial<FrameRequest>) => {
    setSelectionRaw((current) => ({ ...current, ...patch }));
  }, []);

  const setGrid = useCallback(
    (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => {
      setGridRaw((current) =>
        normalizeAlignGridState(typeof next === "function" ? next(current) : next),
      );
    },
    [],
  );

  const setExcludedCellsForCurrentPosition = useCallback(
    (cells: Iterable<AlignGridCellCoord>) => {
      setExcludedCellsByPosition((current) =>
        setExcludedAlignGridCellsForPosition(current, selection.pos, cells),
      );
    },
    [selection.pos],
  );

  useEffect(() => {
    if (!workspacePath) {
      setSource(null);
      setScan(null);
      setFrame(null);
      setError(null);
    }
  }, [workspacePath]);

  useEffect(() => {
    if (!source) {
      setScan(null);
      setFrame(null);
      return;
    }
    let cancelled = false;
    setScanLoading(true);
    setError(null);
    setStatus("Scanning source");
    void alignerClient
      .scanSource(source)
      .then((nextScan) => {
        if (cancelled) return;
        setScan(nextScan);
        setSelectionRaw({
          pos: firstOrZero(nextScan.positions),
          channel: firstOrZero(nextScan.channels),
          time: firstOrZero(nextScan.times),
          z: firstOrZero(nextScan.zSlices),
        });
        setContrast(null);
        setGridRaw(normalizeAlignGridState(createDefaultAlignGrid()));
        setExcludedCellsByPosition({});
        setStatus("Source loaded");
      })
      .catch((cause) => {
        if (cancelled) return;
        setScan(null);
        setFrame(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setScanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    if (!workspacePath || !scan) return;
    let cancelled = false;
    void alignerClient
      .loadAlignState(workspacePath, selection.pos)
      .then((saved) => {
        if (cancelled || !saved) return;
        setGridRaw(normalizeAlignGridState(saved.grid));
        setExcludedCellsByPosition((current) =>
          setExcludedAlignGridCellsForPosition(current, selection.pos, saved.excludedCells),
        );
        setStatus(`Loaded align/Pos${selection.pos}.json`);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [scan, selection.pos, workspacePath]);

  useEffect(() => {
    if (!source || !scan) return;
    let cancelled = false;
    setFrameLoading(true);
    setError(null);
    void alignerClient
      .loadFrame(source, selection, contrast)
      .then((nextFrame) => {
        if (cancelled) return;
        setFrame(nextFrame);
        const nextContrast = nextFrame.appliedContrast ?? nextFrame.suggestedContrast ?? null;
        setContrast((current) =>
          current?.min === nextContrast?.min && current?.max === nextContrast?.max
            ? current
            : nextContrast,
        );
      })
      .catch((cause) => {
        if (cancelled) return;
        setFrame(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setFrameLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contrast, scan, selection, source]);

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
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setSaving(false);
    }
  }, [currentExcludedCells, frame, grid, selection.pos, workspacePath]);

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
        setError(cause instanceof Error ? cause.message : String(cause));
        setCropProgress((current) =>
          current
            ? {
                ...current,
                status: "error",
                error: cause instanceof Error ? cause.message : String(cause),
              }
            : current,
        );
      }
    },
    [source, workspacePath],
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
    const savedPositions = await alignerClient.listSavedBboxPositions(workspacePath);
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
  }, [runCrop, source, workspacePath]);

  const cancelCrop = useCallback(async () => {
    const requestId = cropRequestIdRef.current;
    if (!requestId) return;
    setCropProgress(await alignerClient.cancelCropRoi(requestId));
  }, []);

  const autoExclude = useCallback(async () => {
    if (!source || !frame) return;
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return;
    setStatus("Auto exclude preview");
    try {
      const preview = await alignerClient.autoExcludePreview({
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
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [currentExcludedCells, frame, grid, selection, setExcludedCellsForCurrentPosition, source]);

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
  const positionOptions = useMemo(() => toNavigationOptions(state.scan?.positions ?? []), [state.scan]);
  const channelOptions = useMemo(() => toNavigationOptions(state.scan?.channels ?? []), [state.scan]);
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
        onChange: (i) =>
          state.setSelection({ time: state.scan?.times[clamp(Math.round(i), 0, timeMax)] ?? 0 }),
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
        onChange: (i) =>
          state.setSelection({ z: state.scan?.zSlices[clamp(Math.round(i), 0, zMax)] ?? 0 }),
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
  const value = state.contrast ?? state.frame?.appliedContrast ?? { min: domain.min, max: domain.max };
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
      onReset={() => !disabled && state.setGrid(createDefaultAlignGrid())}
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
  const gestureRef = useRef<AlignGridPointerGestureSession | null>(null);

  const handlePointerDown = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (state.cropping || !event.viewport || !state.grid.enabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) {
        event.preventDefault();
        return;
      }
      const session = beginAlignGridPointerGesture(state.grid, event, state.toolMode);
      if (!session) return;
      event.preventDefault();
      event.capturePointer();
      gestureRef.current = session;
    },
    [state],
  );

  const handlePointerMove = useCallback(
    (event: AlignCanvasPointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || !event.viewport || gesture.pointerId !== event.pointerId) return;
      event.preventDefault();
      state.setGrid(applyAlignGridPointerGesture(gesture, event, event.viewport));
    },
    [state],
  );

  const handlePointerEnd = useCallback((event: AlignCanvasPointerEvent) => {
    if (gestureRef.current?.pointerId === event.pointerId) {
      gestureRef.current = null;
    }
    event.releasePointer();
  }, []);

  return { handlePointerDown, handlePointerMove, handlePointerEnd };
}

function cursorForAlignTool(toolMode: AlignGridToolMode, gridEnabled: boolean) {
  if (!gridEnabled) return "default";
  if (toolMode === "pan") return "grab";
  if (toolMode === "rotate") return "crosshair";
  return "zoom-in";
}

function AlignCanvasPanel({ state }: { state: AlignState }) {
  const { handlePointerDown, handlePointerMove, handlePointerEnd } = useAlignCanvasHandlers(state);
  const messages = useMemo(() => {
    const items = [];
    if (state.error) items.push({ text: state.error, tone: "error" as const });
    else if (state.status) items.push({ text: state.status });
    return items;
  }, [state.error, state.status]);

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
        cursor={cursorForAlignTool(state.toolMode, state.grid.enabled)}
        emptyText={emptyText}
        excludedCells={state.currentExcludedCells}
        frame={state.frame}
        grid={state.grid}
        loading={state.scanLoading || state.frameLoading}
        messages={messages}
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
