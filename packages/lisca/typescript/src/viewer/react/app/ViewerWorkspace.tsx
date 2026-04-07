import { Effect, Exit } from "effect";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ChangeEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type {
  AutoExcludeHistogramBin,
  AutoExcludePreviewCellScore,
  AutoExcludePreviewResponse,
  ContrastWindow,
  CropRoiProgressEvent,
  FrameResult,
  ViewerDataPort,
  ViewerSource,
} from "lisca/viewer/contracts";
import {
  applyGridPointerGesture,
  applyGridWheelGesture,
  beginGridPointerGesture,
  getFrameContrastDomain,
  isPrimaryMouseButton,
  makeFrameKey,
  type GridPointerGestureSession,
  type GridShape,
  type GridState,
} from "lisca/viewer/core";
import {
  buildBboxCsv,
  clamp,
  collectEdgeCells,
  collectStrokeToggleCells,
  countVisibleCells,
  degreesToRadians,
  enumerateVisibleGridCells,
  radiansToDegrees,
  toggleExcludedCells as toggleExcludedCellCoords,
  type GridCellCoord,
} from "lisca/viewer/core";
import {
  ViewerCanvasSurface,
  type ViewerCanvasPointerEvent,
  type ViewerCanvasWheelEvent,
} from "../alignment";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "lisca/viewer/ui";

import {
  excludeCells,
  patchViewState,
  reloadAutoContrast,
  resetExcludedCells,
  resetGrid,
  setCropping,
  setGrid,
  setSaving,
  setSelectionKey,
  setSelectionMode,
  setTimeSliderIndex,
  toggleExcludedCells as toggleStoredExcludedCells,
  viewStore,
} from "./viewStore";
import {
  autoExcludePreviewEffect,
  cancelCropRoiEffect,
  listSavedBboxPositionsEffect,
  cropRoiEffect,
  loadFrameEffect,
  saveBboxEffect,
  scanSourceEffect,
  toErrorMessage,
} from "./viewEffects";
import {
  SidebarField,
  SidebarSection,
  SidebarSegmentedToggle,
  SidebarStat,
  SidebarValue,
} from "./sidebar";
import {
  findNavigationOptionIndex,
  NavigationControls,
  stepNavigationValue,
  toNavigationOptions,
} from "./NavigationControls";
import {
  applyQ20Preset,
  computeBatchCropOverallProgress,
  runBatchCropSequence,
} from "./tools";
import { showErrorToast, showSuccessToast } from "./toast";
import ViewerNavbar, { type ViewerMode } from "./ViewerNavbar";

type SelectValue = number | string;

type Option<T extends SelectValue> = {
  label: string;
  value: T;
};

interface ViewerWorkspaceProps {
  workspacePath: string | null;
  source: ViewerSource | null;
  backend: ViewerDataPort;
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  onPickWorkspace: () => Promise<void>;
  onOpenTif: () => Promise<void>;
  onOpenNd2: () => Promise<void>;
  onOpenCzi: () => Promise<void>;
  onCheckRoiExists: (workspacePath: string, pos: number) => Promise<boolean>;
  onClearSource: () => void;
}

interface CachedFrame {
  frame: FrameResult;
}

interface SelectionStroke {
  pointerId: number;
  hitCellKeys: Set<string>;
  hitCells: GridCellCoord[];
  lastPoint: { x: number; y: number } | null;
}

function gridCellCoordKey(cell: GridCellCoord): string {
  return `${cell.i}:${cell.j}`;
}

class FrameCache {
  private readonly limit: number;

  private readonly map = new Map<string, CachedFrame>();

  constructor(limit = 12) {
    this.limit = limit;
  }

  get(key: string): CachedFrame | undefined {
    const found = this.map.get(key);
    if (!found) return undefined;
    this.map.delete(key);
    this.map.set(key, found);
    return found;
  }

  set(key: string, value: CachedFrame): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    while (this.map.size > this.limit) {
      const first = this.map.keys().next().value;
      if (!first) break;
      this.map.delete(first);
    }
  }
}

function NumberInput({
  value,
  onChange,
  disabled,
  step = "1",
  min,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  step?: string;
  min?: number | string;
}) {
  const [draftValue, setDraftValue] = useState(() => (Number.isFinite(value) ? String(value) : ""));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(Number.isFinite(value) ? String(value) : "");
    }
  }, [isEditing, value]);

  const commitDraft = useCallback(() => {
    const nextValue = Number(draftValue);
    if (Number.isFinite(nextValue)) {
      onChange(nextValue);
      return;
    }
    setDraftValue(Number.isFinite(value) ? String(value) : "");
  }, [draftValue, onChange, value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commitDraft();
        setIsEditing(false);
        event.currentTarget.blur();
        return;
      }
      if (event.key === "Escape") {
        setDraftValue(Number.isFinite(value) ? String(value) : "");
        setIsEditing(false);
        event.currentTarget.blur();
      }
    },
    [commitDraft, value],
  );

  return (
    <Input
      type="number"
      size="sm"
      step={step}
      min={min}
      value={draftValue}
      disabled={disabled}
      onFocus={() => setIsEditing(true)}
      onBlur={() => {
        commitDraft();
        setIsEditing(false);
      }}
      onKeyDown={handleKeyDown}
      onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftValue(event.target.value)}
      className="text-sm"
    />
  );
}

function AppSelect<T extends SelectValue>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <Select<T>
      value={value}
      onValueChange={(next: T | null) => next != null && onChange(next)}
      items={options}
      disabled={disabled}
      modal={false}
    >
      <SelectTrigger size="sm" className="text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AppSlider({
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Slider
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={onChange}
      onValueCommitted={onCommit}
    />
  );
}

function contrastWindowForFrame(frame: FrameResult | null): ContrastWindow {
  if (!frame) return { min: 0, max: 255 };
  return frame.contrastDomain ?? getFrameContrastDomain(frame);
}

function normalizeContrastWindow(window: ContrastWindow, domain: ContrastWindow): ContrastWindow {
  return {
    min: clamp(Math.round(window.min), domain.min, Math.max(domain.min, domain.max - 1)),
    max: clamp(Math.round(window.max), Math.min(domain.min + 1, domain.max), domain.max),
  };
}

interface AutoExcludeDomain {
  min: number;
  max: number;
}

function scoreDomainForPreview(preview: AutoExcludePreviewResponse | null): AutoExcludeDomain {
  const min = preview?.scoreMin ?? 0;
  const max = preview?.scoreMax ?? 1;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  if (max <= min) {
    return { min, max: min + 1 };
  }
  return { min, max };
}

function clampThresholdToDomain(value: number, domain: AutoExcludeDomain): number {
  return clamp(value, domain.min, domain.max);
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) return "0.000";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(3);
}

function autoExcludeCount(cellScores: AutoExcludePreviewCellScore[], threshold: number): number {
  return cellScores.filter((cell) => cell.score <= threshold).length;
}

interface AutoExcludeHistogramDatum {
  x: number;
  start: number;
  end: number;
  count: number;
}

interface CropConfirmState {
  kind: "single" | "batch";
  positions: number[];
  overwritePositions: number[];
}

interface ActiveCropState {
  kind: "single" | "batch";
  requestId: string;
  currentPos: number;
  currentIndex: number;
  total: number;
  cancelling: boolean;
}

const AUTO_EXCLUDE_CHART_MARGIN = {
  top: 12,
  right: 10,
  bottom: 6,
  left: 0,
} as const;
const AUTO_EXCLUDE_Y_AXIS_WIDTH = 40;
const AUTO_EXCLUDE_X_AXIS_HEIGHT = 24;

function createCropRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ViewerWorkspace({
  workspacePath,
  source,
  backend,
  mode,
  onModeChange,
  onPickWorkspace,
  onOpenTif,
  onOpenNd2,
  onOpenCzi,
  onCheckRoiExists,
  onClearSource,
}: ViewerWorkspaceProps) {
  const frameCacheRef = useRef(new FrameCache());
  const dragSessionRef = useRef<GridPointerGestureSession | null>(null);
  const selectionStrokeRef = useRef<SelectionStroke | null>(null);
  const activeCropRef = useRef<ActiveCropState | null>(null);
  const croppingRef = useRef(false);
  const [cropConfirm, setCropConfirm] = useState<CropConfirmState | null>(null);
  const [activeCrop, setActiveCrop] = useState<ActiveCropState | null>(null);
  const [previewGrid, setPreviewGrid] = useState<GridState | null>(null);
  const [selectionPreviewCells, setSelectionPreviewCells] = useState<GridCellCoord[] | null>(null);
  const [autoExcludeOpen, setAutoExcludeOpen] = useState(false);
  const [autoExcludePreview, setAutoExcludePreview] = useState<AutoExcludePreviewResponse | null>(null);
  const [autoExcludeLoading, setAutoExcludeLoading] = useState(false);
  const [autoExcludeError, setAutoExcludeError] = useState<string | null>(null);
  const [autoExcludeThreshold, setAutoExcludeThreshold] = useState<number>(0);
  const [cropProgress, setCropProgressValue] = useState<CropRoiProgressEvent>({
    requestId: "",
    progress: 0,
    message: "Preparing ROI crop...",
  });
  const lastViewerErrorToastRef = useRef<string | null>(null);
  const {
    scan,
    selection,
    grid,
    frame,
    loading,
    error,
    contrastMin,
    contrastMax,
    contrastMode,
    contrastReloadToken,
    timeSliderIndex,
    selectionMode,
    excludedCellsByPosition,
    saving,
    cropping,
  } = useStore(
    viewStore,
    useShallow((state) => ({
      scan: state.scan,
      selection: state.selection,
      grid: state.grid,
      frame: state.frame,
      loading: state.loading,
      error: state.error,
      contrastMin: state.contrastMin,
      contrastMax: state.contrastMax,
      contrastMode: state.contrastMode,
      contrastReloadToken: state.contrastReloadToken,
      timeSliderIndex: state.timeSliderIndex,
      selectionMode: state.selectionMode,
      excludedCellsByPosition: state.excludedCellsByPosition,
      saving: state.saving,
      cropping: state.cropping,
    })),
  );

  useEffect(() => {
    activeCropRef.current = activeCrop;
  }, [activeCrop]);

  useEffect(() => {
    croppingRef.current = cropping;
  }, [cropping]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void getCurrentWindow()
      .onCloseRequested((event) => {
        if (!croppingRef.current) return;
        event.preventDefault();
      })
      .then((dispose) => {
        if (cancelled) {
          dispose();
          return;
        }
        unlisten = dispose;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!source) return;

    const abortController = new AbortController();
    patchViewState({
      loading: true,
      error: null,
      frame: null,
      scan: null,
      selection: null,
      contrastMode: "manual",
    });

    const program = scanSourceEffect(backend, source).pipe(
      Effect.tap(({ scan, selection }) =>
        Effect.sync(() => {
          patchViewState({ scan, selection });
        }),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          patchViewState({ error: toErrorMessage(error) });
        }),
      ),
      Effect.ensuring(
        Effect.sync(() => {
          patchViewState({ loading: false });
        }),
      ),
    );

    void Effect.runPromiseExit(program, {
      signal: abortController.signal,
    }).then((exit) => {
      if (!Exit.isFailure(exit)) return;
      if (abortController.signal.aborted) return;
      patchViewState({ error: toErrorMessage(exit.cause) });
    });

    return () => {
      abortController.abort();
    };
  }, [backend, source]);

  useEffect(() => {
    return backend.onCropRoiProgress((event: CropRoiProgressEvent) => {
      if (activeCropRef.current?.requestId !== event.requestId) return;
      setCropProgressValue(event);
    });
  }, [backend]);

  const finishCropSession = useCallback(
    async () => {
      activeCropRef.current = null;
      croppingRef.current = false;
      setCropping(false);
      setActiveCrop(null);
    },
    [],
  );

  const requestActiveCropCancellation = useCallback(
    async () => {
      const crop = activeCropRef.current;
      if (!crop || !croppingRef.current) return;
      if (crop.cancelling) return;

      const nextCrop = {
        ...crop,
        cancelling: true,
      };
      activeCropRef.current = nextCrop;
      setActiveCrop((current) => (
        current
          ? nextCrop
          : current
      ));

      const exit = await Effect.runPromiseExit(cancelCropRoiEffect(backend, crop.requestId));
      if (Exit.isFailure(exit)) {
        showErrorToast(toErrorMessage(exit.cause));
      }
    },
    [backend],
  );

  const contrastRequestKey =
    contrastMode === "auto" ? `auto:${contrastReloadToken}` : `${contrastMin}:${contrastMax}`;

  useEffect(() => {
    if (!source || !selection) return;

    const frameKey = makeFrameKey(source, selection);
    const cacheKey = `${frameKey}:${contrastRequestKey}`;

    const cached = frameCacheRef.current.get(cacheKey);
    if (cached) {
      const domain = contrastWindowForFrame(cached.frame);
      const applied = cached.frame.appliedContrast ?? cached.frame.suggestedContrast ?? domain;
      const nextContrast = normalizeContrastWindow(applied, domain);
      patchViewState({ error: null });
      patchViewState({
        contrastMin: nextContrast.min,
        contrastMax: nextContrast.max,
        contrastMode: "manual",
        frame: cached.frame,
      });
      return;
    }

    const abortController = new AbortController();
    patchViewState({ loading: true, error: null });

    const program = loadFrameEffect(backend, source, selection, {
      mode: contrastMode,
      min: contrastMin,
      max: contrastMax,
    }).pipe(
      Effect.tap(({ frame: loadedFrame }) =>
        Effect.sync(() => {
          frameCacheRef.current.set(cacheKey, { frame: loadedFrame });
        }),
      ),
      Effect.tap(({ frame: loadedFrame, contrastMin, contrastMax }) =>
        Effect.sync(() => {
          if (contrastMode === "auto") {
            frameCacheRef.current.set(`${frameKey}:${contrastMin}:${contrastMax}`, {
              frame: loadedFrame,
            });
          }
          patchViewState({
            contrastMin,
            contrastMax,
            contrastMode: "manual",
            frame: loadedFrame,
          });
        }),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          patchViewState({
            error: toErrorMessage(error),
            frame: null,
          });
        }),
      ),
      Effect.ensuring(
        Effect.sync(() => {
          patchViewState({ loading: false });
        }),
      ),
    );

    void Effect.runPromiseExit(program, {
      signal: abortController.signal,
    }).then((exit) => {
      if (!Exit.isFailure(exit)) return;
      if (abortController.signal.aborted) return;
      patchViewState({
        error: toErrorMessage(exit.cause),
        frame: null,
      });
    });

    return () => {
      abortController.abort();
    };
  }, [backend, contrastMax, contrastMin, contrastMode, contrastRequestKey, selection, source]);

  const hasScan = !!scan && scan.positions.length > 0;
  const controlsDisabled = !hasScan || !selection;
  const contrastDomain = useMemo(() => contrastWindowForFrame(frame), [frame]);
  const contrastMinSliderMax = Math.max(contrastDomain.min + 1, contrastDomain.max) - 1;
  const contrastMaxSliderMin = Math.min(contrastDomain.max - 1, contrastDomain.min + 1);
  const [contrastDraft, setContrastDraft] = useState<ContrastWindow | null>(null);
  const gridDegrees = radiansToDegrees(grid.rotation);
  const minGridSpacing = Math.min(grid.cellWidth, grid.cellHeight);
  const positionOptions = useMemo(() => toNavigationOptions(scan?.positions ?? []), [scan]);
  const channelOptions = useMemo(() => toNavigationOptions(scan?.channels ?? []), [scan]);
  const zValues = scan?.zSlices ?? [];
  const selectedPosition = selection?.pos ?? positionOptions[0]?.value ?? null;
  const selectedChannel = selection?.channel ?? channelOptions[0]?.value ?? null;
  const selectedZ = selection?.z ?? zValues[0] ?? null;
  const selectedPositionIndex = findNavigationOptionIndex(positionOptions, selectedPosition);
  const selectedChannelIndex = findNavigationOptionIndex(channelOptions, selectedChannel);
  const selectedZIndex = useMemo(() => {
    if (!selection) return 0;
    const index = zValues.indexOf(selection.z);
    return index >= 0 ? index : 0;
  }, [selection, zValues]);
  const shapeOptions = useMemo<Option<GridShape>[]>(
    () => [
      { label: "Square", value: "square" },
      { label: "Hex", value: "hex" },
    ],
    [],
  );
  const timeValues = scan?.times ?? [];
  const selectedTimeIndex = useMemo(() => {
    if (!selection) return 0;
    const index = timeValues.indexOf(selection.time);
    return index >= 0 ? index : 0;
  }, [selection, timeValues]);
  const [zSliderIndex, setZSliderIndex] = useState(0);
  const displayedTime = timeValues[timeSliderIndex] ?? selection?.time ?? 0;
  const timeSliderMax = Math.max(0, timeValues.length - 1);
  const displayedZ = zValues[zSliderIndex] ?? selection?.z ?? 0;
  const zSliderMax = Math.max(0, zValues.length - 1);

  useEffect(() => {
    setTimeSliderIndex(selectedTimeIndex);
  }, [selectedTimeIndex]);

  useEffect(() => {
    setZSliderIndex(selectedZIndex);
  }, [selectedZIndex]);

  useEffect(() => {
    setContrastDraft({
      min: contrastMin,
      max: contrastMax,
    });
  }, [contrastMax, contrastMin]);

  const displayedContrast = contrastDraft ?? {
    min: contrastMin,
    max: contrastMax,
  };

  useEffect(() => {
    if (!grid.enabled || !frame) {
      setSelectionMode(false);
    }
  }, [frame, grid.enabled]);

  useEffect(() => {
    if (!error) {
      lastViewerErrorToastRef.current = null;
      return;
    }
    if (lastViewerErrorToastRef.current === error) return;
    lastViewerErrorToastRef.current = error;
    showErrorToast(error);
  }, [error]);

  useEffect(() => {
    dragSessionRef.current = null;
    selectionStrokeRef.current = null;
    setPreviewGrid(null);
    setSelectionPreviewCells(null);
  }, [frame, selectionMode, selection?.pos]);

  const currentPositionExcludedCells = useMemo(
    () => (selection ? excludedCellsByPosition[selection.pos] ?? [] : []),
    [excludedCellsByPosition, selection],
  );
  const activeExcludedCellKeys = useMemo(
    () => new Set(currentPositionExcludedCells.map(gridCellCoordKey)),
    [currentPositionExcludedCells],
  );
  const renderedExcludedCells = useMemo(
    () =>
      selectionPreviewCells
        ? toggleExcludedCellCoords(currentPositionExcludedCells, selectionPreviewCells)
        : currentPositionExcludedCells,
    [currentPositionExcludedCells, selectionPreviewCells],
  );
  const visibleCells = useMemo(
    () => (frame ? enumerateVisibleGridCells(frame, grid) : []),
    [frame, grid],
  );
  const visibleCellCounts = useMemo(
    () => (frame ? countVisibleCells(frame, grid, currentPositionExcludedCells) : { included: 0, excluded: 0 }),
    [currentPositionExcludedCells, frame, grid],
  );
  const excludedVisibleCount = visibleCellCounts.excluded;
  const includedVisibleCount = visibleCellCounts.included;
  const autoExcludeDomain = useMemo(
    () => scoreDomainForPreview(autoExcludePreview),
    [autoExcludePreview],
  );
  const autoExcludeHistogramData = useMemo<AutoExcludeHistogramDatum[]>(
    () =>
      (autoExcludePreview?.histogramBins ?? []).map((bin: AutoExcludeHistogramBin) => ({
        x: (bin.start + bin.end) / 2,
        start: bin.start,
        end: bin.end,
        count: bin.count,
      })),
    [autoExcludePreview],
  );
  const autoExcludeSelectionCount = useMemo(
    () => autoExcludeCount(autoExcludePreview?.cellScores ?? [], autoExcludeThreshold),
    [autoExcludePreview, autoExcludeThreshold],
  );

  useEffect(() => {
    if (!autoExcludeOpen) return;
    if (!source || !selection || !frame || !grid.enabled) {
      setAutoExcludeOpen(false);
    }
  }, [autoExcludeOpen, frame, grid.enabled, selection, source]);

  useEffect(() => {
    if (!autoExcludeOpen || !source || !selection || !frame || !grid.enabled) return;

    let cancelled = false;
    setAutoExcludeLoading(true);
    setAutoExcludeError(null);
    const cells = enumerateVisibleGridCells(frame, grid).filter(
      (cell) => !activeExcludedCellKeys.has(gridCellCoordKey(cell)),
    );

    const program = autoExcludePreviewEffect(backend, {
      source,
      selection,
      cells,
    }).pipe(
      Effect.tap(({ preview }) =>
        Effect.sync(() => {
          if (cancelled) return;
          setAutoExcludePreview(preview);
          setAutoExcludeThreshold(clampThresholdToDomain(preview.threshold, scoreDomainForPreview(preview)));
        }),
      ),
      Effect.catchAll((previewError) =>
        Effect.sync(() => {
          if (cancelled) return;
          setAutoExcludePreview(null);
          setAutoExcludeError(toErrorMessage(previewError));
        }),
      ),
      Effect.ensuring(
        Effect.sync(() => {
          if (!cancelled) {
            setAutoExcludeLoading(false);
          }
        }),
      ),
    );

    void Effect.runPromiseExit(program).then((exit) => {
      if (!Exit.isFailure(exit) || cancelled) return;
      setAutoExcludePreview(null);
      setAutoExcludeError(toErrorMessage(exit.cause));
      setAutoExcludeLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeExcludedCellKeys, autoExcludeOpen, backend, frame, grid, selection, source]);

  const emptyText = useMemo(() => {
    if (!workspacePath) return "Select a workspace folder to save bbox CSVs";
    if (!source) return "Select a TIF folder or ND2 file to load frames";
    if (scan && scan.positions.length === 0) {
      return source.kind === "nd2"
        ? "No frames found in ND2 file"
        : source.kind === "czi"
          ? "No frames found in CZI file"
          : "No frames found in TIF folder";
    }
    return "No frame loaded";
  }, [scan, source, workspacePath]);

  const handleSave = useCallback(async () => {
    if (!workspacePath || !source || !selection || !frame) return;

    setSaving(true);
    const exit = await Effect.runPromiseExit(
      saveBboxEffect(backend, {
        workspacePath,
        source,
        pos: selection.pos,
        csv: buildBboxCsv(frame, grid, currentPositionExcludedCells),
      }),
    );

    if (Exit.isSuccess(exit)) {
      const response = exit.value;
      if (!response.ok) {
        showErrorToast(response.error ?? "Failed to save bbox CSV");
      } else {
        showSuccessToast(`Saved bbox CSV for Pos${selection.pos}`);
      }
      setSaving(false);
      return;
    }

    showErrorToast(toErrorMessage(exit.cause));
    setSaving(false);
  }, [backend, currentPositionExcludedCells, frame, grid, selection, source, workspacePath]);

  const handleExcludeEdgeBboxes = useCallback(() => {
    if (!frame || !selection) return;
    const edgeCells = collectEdgeCells(frame, grid);
    if (edgeCells.length === 0) return;
    excludeCells(selection.pos, edgeCells);
  }, [frame, grid, selection]);

  const handleResetExcludedCells = useCallback(() => {
    if (!selection) return;
    resetExcludedCells(selection.pos);
  }, [selection]);

  const handleExcludeAllVisibleCells = useCallback(() => {
    if (!selection || visibleCells.length === 0) return;
    excludeCells(selection.pos, visibleCells.map((cell) => ({ i: cell.i, j: cell.j })));
  }, [selection, visibleCells]);

  const handleOpenAutoExclude = useCallback(() => {
    setAutoExcludeError(null);
    setAutoExcludePreview(null);
    setAutoExcludeOpen(true);
  }, []);

  const handleApplyAutoExclude = useCallback(() => {
    if (!selection) return;

    const cellsToExclude =
      autoExcludePreview?.cellScores
        .filter((cell) => cell.score <= autoExcludeThreshold)
        .map((cell) => ({ i: cell.i, j: cell.j })) ?? [];

    if (cellsToExclude.length > 0) {
      excludeCells(selection.pos, cellsToExclude);
      showSuccessToast(`Auto excluded ${cellsToExclude.length} cells for Pos${selection.pos}`);
    } else {
      showSuccessToast(`Auto exclude found no cells for Pos${selection.pos}`);
    }

    setAutoExcludeOpen(false);
  }, [autoExcludePreview, autoExcludeThreshold, selection]);

  const handleLoadQ20Preset = useCallback(() => {
    setGrid((current) => applyQ20Preset(current));
    showSuccessToast("Loaded preset Q20");
  }, []);

  const performSingleCrop = useCallback(async (pos: number) => {
    if (!workspacePath || !source) return;

    const requestId = createCropRequestId();
    setActiveCrop({
      kind: "single",
      requestId,
      currentPos: pos,
      currentIndex: 0,
      total: 1,
      cancelling: false,
    });
    activeCropRef.current = {
      kind: "single",
      requestId,
      currentPos: pos,
      currentIndex: 0,
      total: 1,
      cancelling: false,
    };
    croppingRef.current = true;
    setCropping(true);
    setCropProgressValue({
      requestId,
      progress: 0,
      message: `Preparing ROI crop for Pos${pos}...`,
    });

    const exit = await Effect.runPromiseExit(
      cropRoiEffect(backend, {
        workspacePath,
        source,
        pos,
        requestId,
      }),
    );

    if (Exit.isSuccess(exit)) {
      const response = exit.value;
      if (response.status === "success") {
        setCropProgressValue((current) => ({
          ...current,
          progress: 1,
          message: `Finished ROI crop for Pos${pos}`,
        }));
        showSuccessToast(`Cropped ROI TIFFs for Pos${pos}`);
      } else if (response.status === "cancelled") {
        showSuccessToast(`Cancelled ROI crop for Pos${pos}`);
      } else {
        showErrorToast(response.error ?? "Failed to crop ROI TIFFs");
      }
      await finishCropSession();
      return;
    }

    showErrorToast(toErrorMessage(exit.cause));
    await finishCropSession();
  }, [backend, finishCropSession, source, workspacePath]);

  const performBatchCrop = useCallback(async (positions: number[], skippedExistingCount = 0) => {
    if (!workspacePath || !source || positions.length === 0) return;

    setActiveCrop({
      kind: "batch",
      requestId: "",
      currentPos: positions[0] ?? 0,
      currentIndex: 0,
      total: positions.length,
      cancelling: false,
    });
    activeCropRef.current = {
      kind: "batch",
      requestId: "",
      currentPos: positions[0] ?? 0,
      currentIndex: 0,
      total: positions.length,
      cancelling: false,
    };
    croppingRef.current = true;
    setCropping(true);
    setCropProgressValue({
      requestId: "",
      progress: 0,
      message: `Preparing batch crop for ${positions.length} positions...`,
    });

    const result = await runBatchCropSequence(positions, async (pos, index) => {
      if (activeCropRef.current?.cancelling) {
        return { status: "cancelled" as const };
      }

      const requestId = createCropRequestId();
      activeCropRef.current = {
        ...(activeCropRef.current ?? {
          kind: "batch",
          requestId: "",
          currentPos: pos,
          currentIndex: index,
          total: positions.length,
          cancelling: false,
        }),
        requestId,
        currentPos: pos,
        currentIndex: index,
      };
      setActiveCrop((current) => (
        current
          ? {
              ...current,
              requestId,
              currentPos: pos,
              currentIndex: index,
            }
          : current
      ));
      setCropProgressValue({
        requestId,
        progress: 0,
        message: `Preparing ROI crop for Pos${pos}...`,
      });

      const exit = await Effect.runPromiseExit(
        cropRoiEffect(backend, {
          workspacePath,
          source,
          pos,
          requestId,
        }),
      );

      if (Exit.isFailure(exit)) {
        return {
          status: "error" as const,
          error: toErrorMessage(exit.cause),
        };
      }

      const response = exit.value;
      if (response.status === "success") {
        setCropProgressValue((current) => ({
          ...current,
          progress: 1,
          message: `Finished ROI crop for Pos${pos}`,
        }));
      }

      return {
        status: response.status,
        error: response.error,
      };
    });

    const skippedSummary = skippedExistingCount > 0 ? `; skipped ${skippedExistingCount} existing` : "";

    if (result.cancelledAtPos != null) {
      const failureSummary = result.failures.length > 0
        ? ` after failures in ${result.failures.map((failure) => `Pos${failure.pos}`).join(", ")}`
        : "";
      showSuccessToast(
        `Batch crop cancelled at Pos${result.cancelledAtPos}; ${result.succeeded}/${result.total} succeeded${failureSummary}${skippedSummary}`,
      );
      await finishCropSession();
      return;
    }

    if (result.failures.length > 0) {
      showErrorToast(
        `Batch crop finished with failures in ${result.failures.map((failure) => `Pos${failure.pos}`).join(", ")}; ${result.succeeded}/${result.total} succeeded${skippedSummary}`,
      );
      await finishCropSession();
      return;
    }

    showSuccessToast(`Batch cropped ROI TIFFs for ${result.succeeded} positions${skippedSummary}`);
    await finishCropSession();
  }, [backend, finishCropSession, source, workspacePath]);

  const handleCrop = useCallback(async () => {
    if (!workspacePath || !source || !selection) return;

    const exists = await onCheckRoiExists(workspacePath, selection.pos);
    if (exists) {
      setCropConfirm({
        kind: "single",
        positions: [selection.pos],
        overwritePositions: [selection.pos],
      });
      return;
    }

    await performSingleCrop(selection.pos);
  }, [onCheckRoiExists, performSingleCrop, selection, source, workspacePath]);

  const handleBatchCrop = useCallback(async () => {
    if (!workspacePath || !source || cropping) return;

    const exit = await Effect.runPromiseExit(listSavedBboxPositionsEffect(backend, workspacePath));
    if (Exit.isFailure(exit)) {
      showErrorToast(toErrorMessage(exit.cause));
      return;
    }

    const positions = exit.value.positions;
    if (positions.length === 0) {
      showErrorToast("No saved bbox CSVs found in the workspace");
      return;
    }

    const overwritePositions: number[] = [];
    for (const pos of positions) {
      if (await onCheckRoiExists(workspacePath, pos)) {
        overwritePositions.push(pos);
      }
    }

    if (overwritePositions.length > 0) {
      setCropConfirm({
        kind: "batch",
        positions,
        overwritePositions,
      });
      return;
    }

    await performBatchCrop(positions);
  }, [backend, cropping, onCheckRoiExists, performBatchCrop, source, workspacePath]);

  const handleOverwriteCrop = useCallback(() => {
    if (!cropConfirm) return;
    const next = cropConfirm;
    setCropConfirm(null);

    if (next.kind === "single") {
      const pos = next.positions[0];
      if (pos != null) {
        void performSingleCrop(pos);
      }
      return;
    }

    void performBatchCrop(next.positions);
  }, [cropConfirm, performBatchCrop, performSingleCrop]);

  const handleSkipExistingCrop = useCallback(() => {
    if (!cropConfirm) return;
    const next = cropConfirm;
    setCropConfirm(null);

    if (next.kind === "single") {
      return;
    }

    const overwriteSet = new Set(next.overwritePositions);
    const remainingPositions = next.positions.filter((pos) => !overwriteSet.has(pos));
    const skippedExistingCount = next.overwritePositions.length;

    if (remainingPositions.length === 0) {
      showSuccessToast(`Skipped batch crop for ${skippedExistingCount} existing positions`);
      return;
    }

    void performBatchCrop(remainingPositions, skippedExistingCount);
  }, [cropConfirm, performBatchCrop]);

  const bboxPath = useMemo(() => {
    if (!selection) return "bbox/Pos{n}.csv";
    return `bbox/Pos${selection.pos}.csv`;
  }, [selection]);

  const roiPath = useMemo(() => {
    if (!selection) return "roi/Pos{n}";
    return `roi/Pos${selection.pos}`;
  }, [selection]);
  const canResetExcludedCells = !!selection && currentPositionExcludedCells.length > 0;
  const canExcludeAllVisibleCells = !!frame && !!selection && includedVisibleCount > 0;
  const canOpenAutoExclude = !!source && !!frame && !!selection && grid.enabled && includedVisibleCount > 0;
  const canApplyAutoExclude = !autoExcludeLoading && !!autoExcludePreview && !autoExcludeError;
  const completedBatchPositions = activeCrop?.kind === "batch"
    ? activeCrop.currentIndex + (cropProgress.progress >= 1 ? 1 : 0)
    : 0;
  const batchPositionProgressPercent = activeCrop?.kind === "batch" && activeCrop.total > 0
    ? Math.round((completedBatchPositions / activeCrop.total) * 100)
    : 0;
  const frameProgressPercent = Math.round(cropProgress.progress * 100);
  const cropProgressPercent = Math.round(
    (activeCrop?.kind === "batch"
      ? computeBatchCropOverallProgress(activeCrop.currentIndex, activeCrop.total, cropProgress.progress)
      : cropProgress.progress) * 100,
  );
  const canvasCursor = selectionMode ? "crosshair" : grid.enabled ? (previewGrid ? "grabbing" : "grab") : "default";

  const collectSelectionStroke = useCallback(
    (stroke: SelectionStroke, point: { x: number; y: number }, startPoint: { x: number; y: number }) => {
      if (!frame) return;
      const fromPoint = stroke.lastPoint ?? startPoint;
      const nextCells = collectStrokeToggleCells(frame, grid, fromPoint, point, stroke.hitCells);
      for (const cell of nextCells) {
        const key = gridCellCoordKey(cell);
        if (stroke.hitCellKeys.has(key)) continue;
        stroke.hitCellKeys.add(key);
        stroke.hitCells.push(cell);
      }
      stroke.lastPoint = point;
      setSelectionPreviewCells(stroke.hitCells.slice());
    },
    [frame, grid],
  );

  const handleCanvasPointerDown = useCallback(
    (event: ViewerCanvasPointerEvent) => {
      if (selectionMode) {
        if (!frame || !selection || !isPrimaryMouseButton(event) || !event.framePoint) return;
        const stroke: SelectionStroke = {
          pointerId: event.pointerId,
          hitCellKeys: new Set<string>(),
          hitCells: [],
          lastPoint: null,
        };
        collectSelectionStroke(stroke, event.framePoint, event.framePoint);
        selectionStrokeRef.current = stroke;
        event.capturePointer();
        event.preventDefault();
        return;
      }

      if (!grid.enabled) return;
      const session = beginGridPointerGesture(grid, event);
      if (!session) return;
      dragSessionRef.current = session;
      event.capturePointer();
      event.preventDefault();
    },
    [collectSelectionStroke, frame, grid, selection, selectionMode],
  );

  const handleCanvasPointerMove = useCallback(
    (event: ViewerCanvasPointerEvent) => {
      if (selectionMode) {
        const stroke = selectionStrokeRef.current;
        if (!stroke || stroke.pointerId !== event.pointerId) return;
        if (!event.framePoint) {
          stroke.lastPoint = null;
          return;
        }
        collectSelectionStroke(stroke, event.framePoint, event.framePoint);
        event.preventDefault();
        return;
      }

      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId || !event.viewport) return;
      setPreviewGrid(applyGridPointerGesture(session, event, event.viewport));
      event.preventDefault();
    },
    [collectSelectionStroke, selectionMode],
  );

  const handleCanvasPointerEnd = useCallback(
    (event: ViewerCanvasPointerEvent) => {
      if (selectionMode) {
        const stroke = selectionStrokeRef.current;
        if (!stroke || stroke.pointerId !== event.pointerId) return;
        if (event.framePoint) {
          collectSelectionStroke(stroke, event.framePoint, event.framePoint);
        }
        selectionStrokeRef.current = null;
        setSelectionPreviewCells(null);
        if (selection && stroke.hitCells.length > 0) {
          toggleStoredExcludedCells(selection.pos, stroke.hitCells);
        }
        event.releasePointer();
        return;
      }

      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      dragSessionRef.current = null;
      if (previewGrid) {
        setGrid(previewGrid);
      }
      setPreviewGrid(null);
      event.releasePointer();
    },
    [collectSelectionStroke, previewGrid, selection, selectionMode],
  );

  const handleCanvasWheel = useCallback(
    (event: ViewerCanvasWheelEvent) => {
      if (!frame || !grid.enabled || selectionMode || !event.viewport) return;
      event.preventDefault();
      dragSessionRef.current = null;
      setPreviewGrid(null);
      setGrid(applyGridWheelGesture(grid, event, event.viewport));
    },
    [frame, grid, selectionMode],
  );

  const updateAutoExcludeThresholdFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / Math.max(rect.width, 1);
      const nextThreshold =
        autoExcludeDomain.min
        + clamp(relativeX, 0, 1) * (autoExcludeDomain.max - autoExcludeDomain.min);
      setAutoExcludeThreshold(clampThresholdToDomain(nextThreshold, autoExcludeDomain));
    },
    [autoExcludeDomain],
  );

  const handleAutoExcludeHistogramPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      updateAutoExcludeThresholdFromPointer(event);
    },
    [updateAutoExcludeThresholdFromPointer],
  );

  const handleAutoExcludeHistogramPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      updateAutoExcludeThresholdFromPointer(event);
    },
    [updateAutoExcludeThresholdFromPointer],
  );

  const handleAutoExcludeHistogramPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      updateAutoExcludeThresholdFromPointer(event);
    },
    [updateAutoExcludeThresholdFromPointer],
  );

  return (
    <div className="h-full min-h-[720px] min-w-[1280px] overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-h-0 flex-col">
        <ViewerNavbar
          workspacePath={workspacePath}
          source={source}
          mode={mode}
          onModeChange={onModeChange}
          modeChangeDisabled={cropping}
          onPickWorkspace={onPickWorkspace}
          onOpenTif={onOpenTif}
          onOpenNd2={onOpenNd2}
          onOpenCzi={onOpenCzi}
          onClearSource={onClearSource}
          onBatchCrop={() => void handleBatchCrop()}
          onLoadQ20Preset={handleLoadQ20Preset}
          canBatchCrop={!cropping && !!workspacePath && !!source}
          canLoadQ20Preset={!cropping}
        />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-[16rem_minmax(0,1fr)_20rem] items-stretch">
            <aside className="h-full min-h-0 overflow-y-auto divide-y divide-border border-r border-border px-5 py-4">
              <SidebarSection title="Frame">
                <NavigationControls
                  position={{
                    value: selection?.pos ?? (positionOptions[0]?.value ?? 0),
                    options: positionOptions,
                    disabled: controlsDisabled,
                    onChange: (value) => setSelectionKey("pos", value),
                    previousDisabled: controlsDisabled || selectedPositionIndex <= 0,
                    nextDisabled: controlsDisabled || selectedPositionIndex >= positionOptions.length - 1,
                    onPrevious: () => {
                      const nextValue = stepNavigationValue(positionOptions, selectedPosition, -1);
                      if (nextValue != null && nextValue !== selection?.pos) {
                        setSelectionKey("pos", nextValue);
                      }
                    },
                    onNext: () => {
                      const nextValue = stepNavigationValue(positionOptions, selectedPosition, 1);
                      if (nextValue != null && nextValue !== selection?.pos) {
                        setSelectionKey("pos", nextValue);
                      }
                    },
                  }}
                  channel={{
                    value: selection?.channel ?? (channelOptions[0]?.value ?? 0),
                    options: channelOptions,
                    disabled: controlsDisabled,
                    onChange: (value) => setSelectionKey("channel", value),
                    previousDisabled: controlsDisabled || selectedChannelIndex <= 0,
                    nextDisabled: controlsDisabled || selectedChannelIndex >= channelOptions.length - 1,
                    onPrevious: () => {
                      const nextValue = stepNavigationValue(channelOptions, selectedChannel, -1);
                      if (nextValue != null && nextValue !== selection?.channel) {
                        setSelectionKey("channel", nextValue);
                      }
                    },
                    onNext: () => {
                      const nextValue = stepNavigationValue(channelOptions, selectedChannel, 1);
                      if (nextValue != null && nextValue !== selection?.channel) {
                        setSelectionKey("channel", nextValue);
                      }
                    },
                  }}
                  timepoint={{
                    hint: String(displayedTime),
                    value: timeSliderIndex,
                    min: 0,
                    max: timeSliderMax,
                    step: 1,
                    disabled: controlsDisabled || timeValues.length <= 1,
                    onChange: (nextIndex) => setTimeSliderIndex(clamp(Math.round(nextIndex), 0, timeSliderMax)),
                    onCommit: (nextIndex) => {
                      const rounded = clamp(Math.round(nextIndex), 0, timeSliderMax);
                      setTimeSliderIndex(rounded);
                      const nextTime = timeValues[rounded];
                      if (nextTime != null && nextTime !== selection?.time) {
                        setSelectionKey("time", nextTime);
                      }
                    },
                    previousDisabled: controlsDisabled || timeValues.length <= 1 || timeSliderIndex <= 0,
                    nextDisabled: controlsDisabled || timeValues.length <= 1 || timeSliderIndex >= timeSliderMax,
                    onPrevious: () => {
                      const nextIndex = Math.max(0, timeSliderIndex - 1);
                      setTimeSliderIndex(nextIndex);
                      const nextTime = timeValues[nextIndex];
                      if (nextTime != null && nextTime !== selection?.time) {
                        setSelectionKey("time", nextTime);
                      }
                    },
                    onNext: () => {
                      const nextIndex = Math.min(timeSliderMax, timeSliderIndex + 1);
                      setTimeSliderIndex(nextIndex);
                      const nextTime = timeValues[nextIndex];
                      if (nextTime != null && nextTime !== selection?.time) {
                        setSelectionKey("time", nextTime);
                      }
                    },
                  }}
                  zPlane={{
                    hint: String(displayedZ),
                    value: zSliderIndex,
                    min: 0,
                    max: zSliderMax,
                    step: 1,
                    disabled: controlsDisabled || zValues.length <= 1,
                    onChange: (nextIndex) => setZSliderIndex(clamp(Math.round(nextIndex), 0, zSliderMax)),
                    onCommit: (nextIndex) => {
                      const rounded = clamp(Math.round(nextIndex), 0, zSliderMax);
                      setZSliderIndex(rounded);
                      const nextZ = zValues[rounded];
                      if (nextZ != null && nextZ !== selection?.z) {
                        setSelectionKey("z", nextZ);
                      }
                    },
                    previousDisabled: controlsDisabled || zValues.length <= 1 || zSliderIndex <= 0,
                    nextDisabled: controlsDisabled || zValues.length <= 1 || zSliderIndex >= zSliderMax,
                    onPrevious: () => {
                      const nextIndex = Math.max(0, zSliderIndex - 1);
                      setZSliderIndex(nextIndex);
                      const nextZ = zValues[nextIndex];
                      if (nextZ != null && nextZ !== selection?.z) {
                        setSelectionKey("z", nextZ);
                      }
                    },
                    onNext: () => {
                      const nextIndex = Math.min(zSliderMax, zSliderIndex + 1);
                      setZSliderIndex(nextIndex);
                      const nextZ = zValues[nextIndex];
                      if (nextZ != null && nextZ !== selection?.z) {
                        setSelectionKey("z", nextZ);
                      }
                    },
                  }}
                />
              </SidebarSection>

              <SidebarSection
                title="Intensity"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!frame}
                    className="h-7 px-2.5 text-xs"
                    onClick={reloadAutoContrast}
                  >
                    Auto Range
                  </Button>
                }
              >
                <SidebarField label="Min Intensity" hint={String(displayedContrast.min)}>
                  <AppSlider
                    value={displayedContrast.min}
                    min={contrastDomain.min}
                    max={contrastMinSliderMax}
                    step={1}
                    disabled={!frame}
                    onChange={(value) => {
                      setContrastDraft((current) => ({
                        min: clamp(
                          Math.round(value),
                          contrastDomain.min,
                          Math.min(contrastMinSliderMax, (current ?? displayedContrast).max - 1),
                        ),
                        max: (current ?? displayedContrast).max,
                      }));
                    }}
                    onCommit={(value) => {
                      patchViewState({
                        contrastMode: "manual",
                        contrastMin: clamp(
                          Math.round(value),
                          contrastDomain.min,
                          Math.min(contrastMinSliderMax, displayedContrast.max - 1),
                        ),
                      });
                    }}
                  />
                </SidebarField>
                <SidebarField label="Max Intensity" hint={String(displayedContrast.max)}>
                  <AppSlider
                    value={displayedContrast.max}
                    min={contrastMaxSliderMin}
                    max={contrastDomain.max}
                    step={1}
                    disabled={!frame}
                    onChange={(value) => {
                      setContrastDraft((current) => ({
                        min: (current ?? displayedContrast).min,
                        max: clamp(
                          Math.round(value),
                          Math.max(contrastMaxSliderMin, (current ?? displayedContrast).min + 1),
                          contrastDomain.max,
                        ),
                      }));
                    }}
                    onCommit={(value) => {
                      patchViewState({
                        contrastMode: "manual",
                        contrastMax: clamp(
                          Math.round(value),
                          Math.max(contrastMaxSliderMin, displayedContrast.min + 1),
                          contrastDomain.max,
                        ),
                      });
                    }}
                  />
                </SidebarField>
              </SidebarSection>

              <SidebarSection title="Outputs">
                <SidebarField label="Bounding Box CSV">
                  <SidebarValue monospace>
                    {bboxPath}
                  </SidebarValue>
                </SidebarField>
                <SidebarField label="ROI Output Folder">
                  <SidebarValue monospace>
                    {roiPath}
                  </SidebarValue>
                </SidebarField>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    disabled={!workspacePath || !frame || !selection || saving || cropping}
                    onClick={() => void handleSave()}
                  >
                    {saving ? "Saving..." : "Save CSV"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    disabled={!workspacePath || !source || !selection || saving || cropping}
                    onClick={() => void handleCrop()}
                  >
                    {cropping ? "Cropping..." : "Crop ROIs"}
                  </Button>
                </div>
              </SidebarSection>
            </aside>

            <section className="h-full min-h-0 min-w-0 overflow-hidden">
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="m-4 flex min-h-0 flex-1 overflow-hidden">
                  <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-border/60 bg-black/10">
                    <ViewerCanvasSurface
                      frame={frame}
                      grid={grid}
                      previewGrid={previewGrid}
                      excludedCells={renderedExcludedCells}
                      loading={loading && !frame}
                      emptyText={emptyText}
                      cursor={canvasCursor}
                      onVirtualPointerDown={handleCanvasPointerDown}
                      onVirtualPointerMove={handleCanvasPointerMove}
                      onVirtualPointerUp={handleCanvasPointerEnd}
                      onVirtualPointerCancel={handleCanvasPointerEnd}
                      onVirtualWheel={handleCanvasWheel}
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="h-full min-h-0 overflow-y-auto divide-y divide-border border-l border-border px-5 py-4">
              <SidebarSection
                title="Grid"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                    disabled={controlsDisabled}
                    onClick={resetGrid}
                  >
                    Reset
                  </Button>
                }
              >
                <SidebarField label="Overlay">
                  <SidebarSegmentedToggle
                    value={grid.enabled ? "visible" : "hidden"}
                    options={[
                      { label: "Hidden", value: "hidden" },
                      { label: "Visible", value: "visible" },
                    ]}
                    compact
                    disabled={controlsDisabled}
                    onChange={(value) =>
                      setGrid((current) => ({ ...current, enabled: value === "visible" }))
                    }
                  />
                </SidebarField>
                <SidebarField label="Grid Shape">
                  <AppSelect
                    value={grid.shape}
                    options={shapeOptions}
                    disabled={controlsDisabled}
                    onChange={(value) => setGrid((current) => ({ ...current, shape: value }))}
                  />
                </SidebarField>

                <SidebarField label="Rotation" hint={`${gridDegrees.toFixed(1)}°`}>
                  <AppSlider
                    value={gridDegrees}
                    min={-180}
                    max={180}
                    step={0.1}
                    disabled={controlsDisabled}
                    onChange={(value) =>
                      setGrid((current) => ({
                        ...current,
                        rotation: degreesToRadians(value),
                      }))
                    }
                  />
                </SidebarField>

                <div className="grid grid-cols-2 gap-2">
                  <SidebarField label="Pitch A">
                    <NumberInput
                      value={grid.spacingA}
                      min={minGridSpacing}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        setGrid((current) => ({
                          ...current,
                          spacingA: Number.isFinite(value) && value > 0 ? value : 1,
                        }))
                      }
                    />
                  </SidebarField>
                  <SidebarField label="Pitch B">
                    <NumberInput
                      value={grid.spacingB}
                      min={minGridSpacing}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        setGrid((current) => ({
                          ...current,
                          spacingB: Number.isFinite(value) && value > 0 ? value : 1,
                        }))
                      }
                    />
                  </SidebarField>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <SidebarField label="Cell Width">
                    <NumberInput
                      value={grid.cellWidth}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        setGrid((current) => ({
                          ...current,
                          cellWidth: Number.isFinite(value) && value > 0 ? value : 1,
                        }))
                      }
                    />
                  </SidebarField>
                  <SidebarField label="Cell Height">
                    <NumberInput
                      value={grid.cellHeight}
                      disabled={controlsDisabled}
                      onChange={(value) =>
                        setGrid((current) => ({
                          ...current,
                          cellHeight: Number.isFinite(value) && value > 0 ? value : 1,
                        }))
                      }
                    />
                  </SidebarField>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <SidebarField label="Offset X">
                    <NumberInput
                      value={grid.tx}
                      disabled={controlsDisabled}
                      step="0.1"
                      onChange={(value) =>
                        setGrid((current) => ({ ...current, tx: Number.isFinite(value) ? value : 0 }))
                      }
                    />
                  </SidebarField>
                  <SidebarField label="Offset Y">
                    <NumberInput
                      value={grid.ty}
                      disabled={controlsDisabled}
                      step="0.1"
                      onChange={(value) =>
                        setGrid((current) => ({ ...current, ty: Number.isFinite(value) ? value : 0 }))
                      }
                    />
                  </SidebarField>
                </div>

                <SidebarField label="Overlay" hint={grid.opacity.toFixed(2)}>
                  <AppSlider
                    value={grid.opacity}
                    min={0}
                    max={1}
                    step={0.01}
                    disabled={controlsDisabled}
                    onChange={(value) =>
                      setGrid((current) => ({ ...current, opacity: clamp(value, 0, 1) }))
                    }
                  />
                </SidebarField>
              </SidebarSection>

              <SidebarSection title="Selection">
                <SidebarField label="Mode">
                  <SidebarSegmentedToggle
                    value={selectionMode ? "edit" : "view"}
                    options={[
                      { label: "Viewer", value: "view" },
                      { label: "Edit", value: "edit" },
                    ]}
                    compact
                    disabled={controlsDisabled || !frame || !grid.enabled}
                    onChange={(value) => setSelectionMode(value === "edit")}
                  />
                </SidebarField>
                <div className="grid grid-cols-2 gap-2">
                  <SidebarField label="Included Cells">
                    <SidebarStat value={includedVisibleCount} tone="info" />
                  </SidebarField>
                  <SidebarField label="Excluded Cells">
                    <SidebarStat value={excludedVisibleCount} tone="danger" />
                  </SidebarField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 justify-center px-3 text-xs"
                    disabled={!canResetExcludedCells}
                    onClick={handleResetExcludedCells}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive-outline"
                    className="h-8 justify-center px-3 text-xs"
                    disabled={!canExcludeAllVisibleCells}
                    onClick={handleExcludeAllVisibleCells}
                  >
                    Exclude All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 justify-center px-3 text-xs"
                    disabled={!frame || !selection}
                    onClick={handleExcludeEdgeBboxes}
                  >
                    Exclude Edge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 justify-center px-3 text-xs"
                    disabled={!canOpenAutoExclude}
                    onClick={handleOpenAutoExclude}
                  >
                    Auto Exclude
                  </Button>
                </div>
              </SidebarSection>
            </aside>
          </div>
        </main>
      </div>
      {autoExcludeOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !autoExcludeLoading) {
              setAutoExcludeOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-[1.5rem] border border-border/80 bg-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-exclude-title"
          >
            <div className="border-b border-border px-5 py-4">
              <div className="space-y-1">
                <h2 id="auto-exclude-title" className="text-base font-medium text-foreground">
                  Auto Exclude
                </h2>
                <p className="text-sm text-muted-foreground">
                  Exclude visible included cells at or below the flatness threshold.
                </p>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div>
                    {autoExcludePreview?.eligibleCellCount ?? 0} eligible, {autoExcludeSelectionCount} at threshold
                  </div>
                  <div>
                    threshold {formatScore(autoExcludeThreshold)}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Flatness histogram
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {formatScore(autoExcludeDomain.min)} to {formatScore(autoExcludeDomain.max)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background/45 p-3">
                  {autoExcludeLoading ? (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      Computing preview...
                    </div>
                  ) : autoExcludeError ? (
                    <div className="flex h-64 items-center justify-center text-sm text-rose-200">
                      {autoExcludeError}
                    </div>
                  ) : autoExcludePreview && autoExcludeHistogramData.length > 0 ? (
                    <div className="relative h-64 w-full select-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={autoExcludeHistogramData}
                          margin={AUTO_EXCLUDE_CHART_MARGIN}
                        >
                          <CartesianGrid stroke="rgba(148, 163, 184, 0.14)" vertical={false} />
                          <XAxis
                            type="number"
                            dataKey="x"
                            domain={[autoExcludeDomain.min, autoExcludeDomain.max]}
                            tick={{ fill: "rgba(148, 163, 184, 0.85)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(148, 163, 184, 0.18)" }}
                            tickFormatter={(value: number) => formatScore(value)}
                          />
                          <YAxis
                            allowDecimals={false}
                            width={AUTO_EXCLUDE_Y_AXIS_WIDTH}
                            tick={{ fill: "rgba(148, 163, 184, 0.85)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(148, 163, 184, 0.18)" }}
                          />
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              background: "rgba(12, 16, 25, 0.96)",
                              border: "1px solid rgba(148, 163, 184, 0.2)",
                              borderRadius: "12px",
                              color: "rgb(226, 232, 240)",
                            }}
                            formatter={(value: number) => [value, "Count"]}
                            labelFormatter={(_label, payload) => {
                              const datum = payload?.[0]?.payload as AutoExcludeHistogramDatum | undefined;
                              return datum
                                ? `${formatScore(datum.start)} - ${formatScore(datum.end)}`
                                : "Flatness";
                            }}
                          />
                          <ReferenceLine
                            x={autoExcludeThreshold}
                            stroke="rgb(252, 165, 165)"
                            strokeWidth={2}
                          />
                          <Bar
                            dataKey="count"
                            fill="rgba(125, 211, 252, 0.85)"
                            stroke="rgba(125, 211, 252, 1)"
                            strokeWidth={1}
                            isAnimationActive={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <div
                        className="absolute touch-none"
                        style={{
                          top: `${AUTO_EXCLUDE_CHART_MARGIN.top}px`,
                          right: `${AUTO_EXCLUDE_CHART_MARGIN.right}px`,
                          bottom: `${AUTO_EXCLUDE_CHART_MARGIN.bottom + AUTO_EXCLUDE_X_AXIS_HEIGHT}px`,
                          left: `${AUTO_EXCLUDE_CHART_MARGIN.left + AUTO_EXCLUDE_Y_AXIS_WIDTH}px`,
                        }}
                        onPointerDown={handleAutoExcludeHistogramPointerDown}
                        onPointerMove={handleAutoExcludeHistogramPointerMove}
                        onPointerUp={handleAutoExcludeHistogramPointerUp}
                        onPointerCancel={handleAutoExcludeHistogramPointerUp}
                      />
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      No visible included cells are eligible for auto exclude.
                    </div>
                  )}
                </div>
              </div>

              <SidebarField label="Threshold">
                <NumberInput
                  value={autoExcludeThreshold}
                  step="0.01"
                  min={autoExcludeDomain.min}
                  disabled={autoExcludeLoading || !autoExcludePreview}
                  onChange={(value) =>
                    setAutoExcludeThreshold(clampThresholdToDomain(value, autoExcludeDomain))
                  }
                />
              </SidebarField>

              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs"
                  disabled={autoExcludeLoading}
                  onClick={() => setAutoExcludeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-9 px-3 text-xs"
                  disabled={!canApplyAutoExclude}
                  onClick={handleApplyAutoExclude}
                >
                  Auto Exclude
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {cropping ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div
            className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-progress-title"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 id="crop-progress-title" className="text-base font-medium text-foreground">
                  {activeCrop?.kind === "batch" ? "Batch Cropping ROI TIFFs" : "Cropping ROI TIFFs"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {cropProgress.message}
                </p>
              </div>
              <div className="space-y-2">
                {activeCrop?.kind === "batch" ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {activeCrop.cancelling
                            ? "Cancelling crop and cleaning up..."
                            : `Position ${Math.min(activeCrop.currentIndex + 1, activeCrop.total)} of ${activeCrop.total}`}
                        </span>
                        <span>{batchPositionProgressPercent}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-150"
                          style={{ width: `${batchPositionProgressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Frame</span>
                        <span>{frameProgressPercent}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-sky-400 transition-[width] duration-150"
                          style={{ width: `${frameProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-150"
                        style={{ width: `${cropProgressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {activeCrop?.cancelling
                          ? "Cancelling crop and cleaning up..."
                          : "Workspace is locked until crop completes."}
                      </span>
                      <span>{cropProgressPercent}%</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  disabled={activeCrop?.cancelling}
                  onClick={() => void requestActiveCropCancellation()}
                >
                  {activeCrop?.cancelling ? "Cancelling..." : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {cropConfirm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4">
          <div
            className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-confirm-title"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 id="crop-confirm-title" className="text-base font-medium text-foreground">
                  ROI Output Already Exists
                </h2>
                <p className="text-sm text-muted-foreground">
                  {cropConfirm.kind === "single"
                    ? `roi/Pos${cropConfirm.positions[0]} already exists. Continuing will replace the existing cropped ROI files for this position.`
                    : `${cropConfirm.overwritePositions.length} of ${cropConfirm.positions.length} saved positions already have ROI output. You can overwrite those folders or skip them and crop only the remaining positions.`}
                </p>
                {cropConfirm.kind === "batch" ? (
                  <p className="text-xs text-muted-foreground">
                    {cropConfirm.overwritePositions.map((pos) => `Pos${pos}`).join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => setCropConfirm(null)}
                >
                  Cancel
                </Button>
                {cropConfirm.kind === "batch" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={handleSkipExistingCrop}
                  >
                    Skip Existing
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={handleOverwriteCrop}
                >
                  Overwrite
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

