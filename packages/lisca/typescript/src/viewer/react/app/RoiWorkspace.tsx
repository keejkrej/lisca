import { Effect, Exit } from "effect";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type {
  AnnotationLabel,
  FrameResult,
  RoiFrameAnnotation,
  RoiFrameRequest,
  RoiIndexEntry,
  RoiPositionScan,
  ViewerCanvasStatusMessage,
  ViewerSource,
  ViewerDataPort,
} from "lisca/viewer/contracts";
import { clamp, createDefaultGrid } from "lisca/viewer/core";
import { ViewerCanvasSurface } from "../alignment";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "lisca/viewer/ui";

import {
  patchRoiState,
  resetRoiState,
  roiStore,
  setRoiPageIndex,
  setRoiScan,
  setRoiSelectionKey,
  setSelectedRoi,
} from "./roiStore";
import {
  loadAnnotationLabelsEffect,
  loadRoiFrameAnnotationEffect,
  loadRoiFrameEffect,
  scanRoiWorkspaceEffect,
  toErrorMessage,
} from "./viewEffects";
import {
  SidebarField,
  SidebarSection,
  SidebarValue,
} from "./sidebar";
import { showErrorToast } from "./toast";
import RoiAnnotationModal from "./RoiAnnotationModal";
import ViewNavbar, { type ViewerMode } from "./ViewNavbar";

type SelectValue = number | string;

type Option<T extends SelectValue> = {
  label: string;
  value: T;
};

interface RoiWorkspaceProps {
  workspacePath: string | null;
  source: ViewerSource | null;
  backend: ViewerDataPort;
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  onPickWorkspace: () => Promise<void>;
  onOpenTif: () => Promise<void>;
  onOpenNd2: () => Promise<void>;
  onOpenCzi: () => Promise<void>;
  onClearSource: () => void;
}

interface CachedFrame {
  frame: FrameResult;
}

interface TileState {
  requestKey: string;
  frame: FrameResult | null;
  error: string | null;
  loading: boolean;
}

interface AnnotationStatusState {
  requestKey: string;
  annotation: RoiFrameAnnotation | null;
  error: string | null;
  loading: boolean;
}

interface AnnotationModalState {
  roi: RoiIndexEntry;
  request: RoiFrameRequest;
  frame: FrameResult;
}

const ROI_PAGE_SIZE = 9;
const ROI_TILE_GRID = {
  ...createDefaultGrid(),
  enabled: false,
  opacity: 0,
};

class FrameCache {
  private readonly limit: number;

  private readonly map = new Map<string, CachedFrame>();

  constructor(limit = 36) {
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

function toOptions(values: number[]): Option<number>[] {
  return values.map((value) => ({ value, label: String(value) }));
}

function currentPositionScan(scan: { positions: RoiPositionScan[] } | null, pos: number | null) {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

function makeRoiFrameKey(workspacePath: string, request: RoiFrameRequest) {
  return [
    workspacePath,
    request.pos,
    request.roi,
    request.channel,
    request.time,
    request.z,
  ].join(":");
}

function hexToRgb(color: string) {
  const value = color.trim();
  if (!value.startsWith("#")) return null;
  const hex = value.slice(1);
  if (hex.length === 3) {
    const [r, g, b] = hex.split("");
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    };
  }
  if (hex.length === 6) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
}

function colorBadgeStyle(color: string) {
  const rgb = hexToRgb(color);
  if (!rgb) return undefined;
  return {
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
    color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}

function tileStatesEqual(
  left: Record<number, TileState>,
  right: Record<number, TileState>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  for (const key of rightKeys) {
    const roi = Number(key);
    const leftState = left[roi];
    const rightState = right[roi];
    if (!leftState || !rightState) return false;
    if (
      leftState.requestKey !== rightState.requestKey ||
      leftState.frame !== rightState.frame ||
      leftState.error !== rightState.error ||
      leftState.loading !== rightState.loading
    ) {
      return false;
    }
  }

  return true;
}

function RoiTile({
  roi,
  tileState,
  selected,
  onSelect,
  onAnnotate,
}: {
  roi: RoiIndexEntry;
  tileState: TileState | undefined;
  selected: boolean;
  onSelect: () => void;
  onAnnotate: () => void;
}) {
  const messages = useMemo<ViewerCanvasStatusMessage[] | undefined>(() => {
    if (!tileState?.error) return undefined;
    return [{ tone: "error", text: tileState.error }];
  }, [tileState?.error]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative flex min-h-0 cursor-pointer flex-col overflow-hidden rounded-2xl border p-2 text-left transition-colors ${
        selected
          ? "border-primary/70 bg-primary/10 shadow-[0_0_0_1px_rgba(59,130,246,0.28)]"
          : "border-border/70 bg-card/70 hover:border-border hover:bg-card"
      }`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onSelect();
        onAnnotate();
      }}
    >
      <div className="min-h-0 flex-1 overflow-hidden rounded-[1.125rem] border border-border/60 bg-black/10">
        <ViewerCanvasSurface
          className="h-full w-full"
          frame={tileState?.frame ?? null}
          grid={ROI_TILE_GRID}
          loading={tileState?.loading ?? false}
          emptyText="No ROI frame"
          messages={messages}
        />
      </div>
    </div>
  );
}

export default function RoiWorkspace({
  workspacePath,
  source,
  backend,
  mode,
  onModeChange,
  onPickWorkspace,
  onOpenTif,
  onOpenNd2,
  onOpenCzi,
  onClearSource,
}: RoiWorkspaceProps) {
  const frameCacheRef = useRef(new FrameCache());
  const annotationStatusesRef = useRef<Record<string, AnnotationStatusState>>({});
  const lastWorkspaceErrorToastRef = useRef<string | null>(null);
  const lastLabelsErrorToastRef = useRef<string | null>(null);
  const [tileStates, setTileStates] = useState<Record<number, TileState>>({});
  const [annotationLabelsState, setAnnotationLabelsState] = useState<{
    labels: AnnotationLabel[] | null;
    loading: boolean;
    error: string | null;
  }>({
    labels: null,
    loading: false,
    error: null,
  });
  const [annotationStatuses, setAnnotationStatuses] = useState<Record<string, AnnotationStatusState>>({});
  const [annotationModal, setAnnotationModal] = useState<AnnotationModalState | null>(null);
  const { scan, selection, loading, error, pageIndex, selectedRoi } = useStore(
    roiStore,
    useShallow((state) => ({
      scan: state.scan,
      selection: state.selection,
      loading: state.loading,
      error: state.error,
      pageIndex: state.pageIndex,
      selectedRoi: state.selectedRoi,
    })),
  );

  useEffect(() => {
    if (!error) {
      lastWorkspaceErrorToastRef.current = null;
      return;
    }
    if (lastWorkspaceErrorToastRef.current === error) return;
    lastWorkspaceErrorToastRef.current = error;
    showErrorToast(error);
  }, [error]);

  useEffect(() => {
    if (!annotationLabelsState.error) {
      lastLabelsErrorToastRef.current = null;
      return;
    }
    if (lastLabelsErrorToastRef.current === annotationLabelsState.error) return;
    lastLabelsErrorToastRef.current = annotationLabelsState.error;
    showErrorToast(annotationLabelsState.error);
  }, [annotationLabelsState.error]);

  useEffect(() => {
    if (!workspacePath) {
      resetRoiState();
      setTileStates({});
      setAnnotationLabelsState({
        labels: null,
        loading: false,
        error: null,
      });
      setAnnotationStatuses({});
      setAnnotationModal(null);
      return;
    }

    const abortController = new AbortController();
    patchRoiState({
      loading: true,
      error: null,
    });

    const program = scanRoiWorkspaceEffect(backend, workspacePath).pipe(
      Effect.tap(({ scan: nextScan }) =>
        Effect.sync(() => {
          setRoiScan(nextScan);
        }),
      ),
      Effect.catchAll((scanError) =>
        Effect.sync(() => {
          patchRoiState({
            scan: null,
            selection: null,
            pageIndex: 0,
            selectedRoi: null,
            error: toErrorMessage(scanError),
          });
        }),
      ),
      Effect.ensuring(
        Effect.sync(() => {
          patchRoiState({ loading: false });
        }),
      ),
    );

    void Effect.runPromiseExit(program, {
      signal: abortController.signal,
    }).then((exit) => {
      if (!Exit.isFailure(exit)) return;
      if (abortController.signal.aborted) return;
      patchRoiState({
        scan: null,
        selection: null,
        pageIndex: 0,
        selectedRoi: null,
        loading: false,
        error: toErrorMessage(exit.cause),
      });
    });

    return () => {
      abortController.abort();
    };
  }, [backend, workspacePath]);

  useEffect(() => {
    if (!workspacePath) return;

    const abortController = new AbortController();
    setAnnotationLabelsState({
      labels: null,
      loading: true,
      error: null,
    });

    const program = loadAnnotationLabelsEffect(backend, workspacePath);
    void Effect.runPromiseExit(program, {
      signal: abortController.signal,
    }).then((exit) => {
      if (abortController.signal.aborted) return;
      if (Exit.isSuccess(exit)) {
        setAnnotationLabelsState({
          labels: exit.value.labels,
          loading: false,
          error: null,
        });
        return;
      }

      setAnnotationLabelsState({
        labels: null,
        loading: false,
        error: toErrorMessage(exit.cause),
      });
    });

    return () => {
      abortController.abort();
    };
  }, [backend, workspacePath]);

  useEffect(() => {
    setAnnotationStatuses({});
    setAnnotationModal(null);
  }, [workspacePath]);

  const position = useMemo(
    () => currentPositionScan(scan, selection?.pos ?? null),
    [scan, selection?.pos],
  );
  const roiEntries = position?.rois ?? [];
  const pageCount = Math.max(1, Math.ceil(roiEntries.length / ROI_PAGE_SIZE));
  const boundedPageIndex = clamp(pageIndex, 0, Math.max(0, pageCount - 1));
  const visibleRois = useMemo(() => {
    const start = boundedPageIndex * ROI_PAGE_SIZE;
    return roiEntries.slice(start, start + ROI_PAGE_SIZE);
  }, [boundedPageIndex, roiEntries]);
  const selectedRoiEntry = useMemo(
    () => roiEntries.find((roi) => roi.roi === selectedRoi) ?? null,
    [roiEntries, selectedRoi],
  );
  const positionOptions = useMemo(
    () => toOptions(scan?.positions.map((entry) => entry.pos) ?? []),
    [scan],
  );
  const channelOptions = useMemo(() => toOptions(position?.channels ?? []), [position]);
  const zOptions = useMemo(() => toOptions(position?.zSlices ?? []), [position]);
  const timeValues = position?.times ?? [];
  const selectedTimeIndex = useMemo(() => {
    if (!selection) return 0;
    const index = timeValues.indexOf(selection.time);
    return index >= 0 ? index : 0;
  }, [selection, timeValues]);
  const [timeSliderIndex, setTimeSliderIndexValue] = useState(0);
  const timeSliderMax = Math.max(0, timeValues.length - 1);
  const controlsDisabled = !selection || !position || roiEntries.length === 0;
  const hasWorkspace = Boolean(workspacePath);
  const hasRoiPositions = Boolean(scan && scan.positions.length > 0);
  const selectedAnnotationRequest = useMemo(() => {
    if (!selection || !selectedRoiEntry) return null;
    return {
      pos: selection.pos,
      roi: selectedRoiEntry.roi,
      channel: selection.channel,
      time: selection.time,
      z: selection.z,
    } satisfies RoiFrameRequest;
  }, [selectedRoiEntry, selection]);
  const selectedAnnotationStatus = useMemo(() => {
    if (!workspacePath || !selectedAnnotationRequest) return null;
    return annotationStatuses[makeRoiFrameKey(workspacePath, selectedAnnotationRequest)] ?? null;
  }, [annotationStatuses, selectedAnnotationRequest, workspacePath]);
  const selectedTileState = selectedRoi != null ? tileStates[selectedRoi] : undefined;
  const selectedAnnotationLabel = useMemo(
    () =>
      annotationLabelsState.labels?.find(
        (entry) => entry.id === selectedAnnotationStatus?.annotation?.classificationLabelId,
      ) ?? null,
    [annotationLabelsState.labels, selectedAnnotationStatus?.annotation?.classificationLabelId],
  );
  const visibleRoiRequests = useMemo(() => {
    if (!workspacePath || !selection) return [];
    return visibleRois.map((roi) => {
      const request = {
        pos: selection.pos,
        roi: roi.roi,
        channel: selection.channel,
        time: selection.time,
        z: selection.z,
      } satisfies RoiFrameRequest;
      return {
        roi,
        request,
        requestKey: makeRoiFrameKey(workspacePath, request),
      };
    });
  }, [
    selection?.channel,
    selection?.pos,
    selection?.time,
    selection?.z,
    visibleRois,
    workspacePath,
  ]);
  const visibleRequestSignature = useMemo(
    () => visibleRoiRequests.map(({ requestKey }) => requestKey).join("|"),
    [visibleRoiRequests],
  );

  useEffect(() => {
    setTimeSliderIndexValue(selectedTimeIndex);
  }, [selectedTimeIndex]);

  useEffect(() => {
    annotationStatusesRef.current = annotationStatuses;
  }, [annotationStatuses]);

  useEffect(() => {
    if (pageIndex === boundedPageIndex) return;
    setRoiPageIndex(boundedPageIndex);
  }, [boundedPageIndex, pageIndex]);

  useEffect(() => {
    if (visibleRois.length === 0) {
      if (selectedRoi != null) setSelectedRoi(null);
      return;
    }

    if (selectedRoi == null || !visibleRois.some((roi) => roi.roi === selectedRoi)) {
      setSelectedRoi(visibleRois[0]?.roi ?? null);
    }
  }, [selectedRoi, visibleRois]);

  useEffect(() => {
    if (!workspacePath || visibleRoiRequests.length === 0) {
      setTileStates((current) => (Object.keys(current).length === 0 ? current : {}));
      return;
    }

    const abortControllers: AbortController[] = [];
    const nextStates: Record<number, TileState> = {};
    for (const { roi, request, requestKey } of visibleRoiRequests) {
      const cached = frameCacheRef.current.get(requestKey);

      nextStates[roi.roi] = {
        requestKey,
        frame: cached?.frame ?? null,
        error: null,
        loading: !cached,
      };

      if (cached) continue;

      const abortController = new AbortController();
      abortControllers.push(abortController);
      const program = loadRoiFrameEffect(backend, workspacePath, request, {
        mode: "auto",
        min: 0,
        max: 65535,
      });

      void Effect.runPromiseExit(program, {
        signal: abortController.signal,
      }).then((exit) => {
        if (abortController.signal.aborted) return;

        if (Exit.isSuccess(exit)) {
          frameCacheRef.current.set(requestKey, { frame: exit.value.frame });
          setTileStates((current) => {
            const active = current[roi.roi];
            if (!active || active.requestKey !== requestKey) return current;
            return {
              ...current,
              [roi.roi]: {
                requestKey,
                frame: exit.value.frame,
                error: null,
                loading: false,
              },
            };
          });
          return;
        }

        setTileStates((current) => {
          const active = current[roi.roi];
          if (!active || active.requestKey !== requestKey) return current;
          return {
            ...current,
            [roi.roi]: {
              requestKey,
              frame: null,
              error: toErrorMessage(exit.cause),
              loading: false,
            },
          };
        });
      });
    }

    setTileStates((current) => (tileStatesEqual(current, nextStates) ? current : nextStates));

    return () => {
      for (const controller of abortControllers) {
        controller.abort();
      }
    };
  }, [backend, visibleRequestSignature, visibleRoiRequests]);

  useEffect(() => {
    if (!workspacePath || visibleRoiRequests.length === 0) {
      return;
    }

    const abortControllers: AbortController[] = [];
    for (const { request, requestKey } of visibleRoiRequests) {
      const cached = annotationStatusesRef.current[requestKey];
      if (cached) continue;

      setAnnotationStatuses((current) => ({
        ...current,
        [requestKey]: {
          requestKey,
          annotation: current[requestKey]?.annotation ?? null,
          error: null,
          loading: true,
        },
      }));

      const abortController = new AbortController();
      abortControllers.push(abortController);
      const program = loadRoiFrameAnnotationEffect(backend, workspacePath, request);
      void Effect.runPromiseExit(program, {
        signal: abortController.signal,
      }).then((exit) => {
        if (abortController.signal.aborted) return;
        if (Exit.isSuccess(exit)) {
          setAnnotationStatuses((current) => ({
            ...current,
            [requestKey]: {
              requestKey,
              annotation: exit.value.loaded.annotation,
              error: null,
              loading: false,
            },
          }));
          return;
        }

        setAnnotationStatuses((current) => ({
          ...current,
          [requestKey]: {
            requestKey,
            annotation: current[requestKey]?.annotation ?? null,
            error: toErrorMessage(exit.cause),
            loading: false,
          },
        }));
      });
    }

    return () => {
      for (const controller of abortControllers) {
        controller.abort();
      }
    };
  }, [backend, visibleRequestSignature, visibleRoiRequests]);

  const emptyText = useMemo(() => {
    if (loading) return "Scanning workspace ROI output...";
    if (error) return error;
    return null;
  }, [error, loading]);

  const openAnnotationModal = useMemo(
    () =>
      (roi: RoiIndexEntry, frame: FrameResult | null) => {
        if (!selection || !frame) return;
        setSelectedRoi(roi.roi);
        setAnnotationModal({
          roi,
          frame,
          request: {
            pos: selection.pos,
            roi: roi.roi,
            channel: selection.channel,
            time: selection.time,
            z: selection.z,
          },
        });
      },
    [selection],
  );

  return (
    <div className="h-full min-h-[720px] min-w-[1280px] overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-h-0 flex-col">
        <ViewNavbar
          workspacePath={workspacePath}
          source={source}
          mode={mode}
          onModeChange={onModeChange}
          onPickWorkspace={onPickWorkspace}
          onOpenTif={onOpenTif}
          onOpenNd2={onOpenNd2}
          onOpenCzi={onOpenCzi}
          onClearSource={onClearSource}
        />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-[16rem_minmax(0,1fr)_20rem] items-stretch">
            <aside className="h-full min-h-0 overflow-y-auto divide-y divide-border border-r border-border px-5 py-4">
              <SidebarSection title="ROI Stack">
                <SidebarField label="Position">
                  <AppSelect
                    value={selection?.pos ?? (positionOptions[0]?.value ?? 0)}
                    options={positionOptions}
                    disabled={!hasRoiPositions || !selection}
                    onChange={(value) => setRoiSelectionKey("pos", value)}
                  />
                </SidebarField>
                <SidebarField label="Channel">
                  <AppSelect
                    value={selection?.channel ?? (channelOptions[0]?.value ?? 0)}
                    options={channelOptions}
                    disabled={controlsDisabled}
                    onChange={(value) => setRoiSelectionKey("channel", value)}
                  />
                </SidebarField>
                <SidebarField
                  label="Timepoint"
                  hint={String(timeValues[timeSliderIndex] ?? selection?.time ?? 0)}
                >
                  <AppSlider
                    value={timeSliderIndex}
                    min={0}
                    max={timeSliderMax}
                    step={1}
                    disabled={controlsDisabled || timeValues.length <= 1}
                    onChange={(nextIndex) =>
                      setTimeSliderIndexValue(clamp(Math.round(nextIndex), 0, timeSliderMax))
                    }
                    onCommit={(nextIndex) => {
                      const rounded = clamp(Math.round(nextIndex), 0, timeSliderMax);
                      setTimeSliderIndexValue(rounded);
                      const nextTime = timeValues[rounded];
                      if (nextTime != null && nextTime !== selection?.time) {
                        setRoiSelectionKey("time", nextTime);
                      }
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={controlsDisabled || timeValues.length <= 1 || timeSliderIndex <= 0}
                      onClick={() => {
                        const nextIndex = Math.max(0, timeSliderIndex - 1);
                        setTimeSliderIndexValue(nextIndex);
                        const nextTime = timeValues[nextIndex];
                        if (nextTime != null && nextTime !== selection?.time) {
                          setRoiSelectionKey("time", nextTime);
                        }
                      }}
                    >
                      {"<"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        controlsDisabled || timeValues.length <= 1 || timeSliderIndex >= timeSliderMax
                      }
                      onClick={() => {
                        const nextIndex = Math.min(timeSliderMax, timeSliderIndex + 1);
                        setTimeSliderIndexValue(nextIndex);
                        const nextTime = timeValues[nextIndex];
                        if (nextTime != null && nextTime !== selection?.time) {
                          setRoiSelectionKey("time", nextTime);
                        }
                      }}
                    >
                      {">"}
                    </Button>
                  </div>
                </SidebarField>
                <SidebarField label="Z Plane">
                  <AppSelect
                    value={selection?.z ?? (zOptions[0]?.value ?? 0)}
                    options={zOptions}
                    disabled={controlsDisabled}
                    onChange={(value) => setRoiSelectionKey("z", value)}
                  />
                </SidebarField>
                <SidebarField label="Page" hint={`${boundedPageIndex + 1} of ${pageCount}`}>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={boundedPageIndex <= 0}
                      onClick={() => setRoiPageIndex((current) => Math.max(0, current - 1))}
                    >
                      <ChevronLeft className="size-4" />
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={boundedPageIndex >= pageCount - 1}
                      onClick={() => setRoiPageIndex((current) => Math.min(pageCount - 1, current + 1))}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </SidebarField>
              </SidebarSection>

              <SidebarSection title="Files">
                <SidebarField label="ROI Output Folder">
                  <SidebarValue monospace>
                    {selection ? `roi/Pos${selection.pos}` : "roi/Pos{n}"}
                  </SidebarValue>
                </SidebarField>
                <SidebarField label="Selected File">
                  <SidebarValue monospace>
                    {selection && selectedRoiEntry
                      ? `roi/Pos${selection.pos}/${selectedRoiEntry.fileName}`
                      : "roi/Pos{n}/Roi{m}.tif"}
                  </SidebarValue>
                </SidebarField>
                <SidebarField label="Source Dataset">
                  <SidebarValue monospace>
                    {position ? `${position.source.kind.toUpperCase()}: ${position.source.path}` : "No ROI source"}
                  </SidebarValue>
                </SidebarField>
              </SidebarSection>
            </aside>

            <section className="h-full min-h-0 min-w-0 overflow-hidden">
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="m-4 min-h-0 flex-1 overflow-hidden">
                  <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border/60 bg-card/10 p-4">
                    {roiEntries.length === 0 ? (
                      emptyText ? (
                        <div className="flex h-full min-h-[18rem] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                          {emptyText}
                        </div>
                      ) : (
                        <div className="h-full min-h-[18rem]" />
                      )
                    ) : (
                      <div className="grid h-full min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-3">
                        {visibleRois.map((roi) => (
                          <RoiTile
                            key={roi.roi}
                            roi={roi}
                            tileState={tileStates[roi.roi]}
                            selected={selectedRoi === roi.roi}
                            onSelect={() => setSelectedRoi(roi.roi)}
                            onAnnotate={() =>
                              openAnnotationModal(roi, tileStates[roi.roi]?.frame ?? null)
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside className="h-full min-h-0 overflow-y-auto divide-y divide-border border-l border-border px-5 py-4">
              <SidebarSection
                title="Selected ROI"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    disabled={!selectedRoiEntry || !selectedTileState?.frame || !selectedAnnotationRequest}
                    onClick={() => {
                      if (!selectedRoiEntry || !selectedTileState?.frame) return;
                      openAnnotationModal(selectedRoiEntry, selectedTileState.frame);
                    }}
                  >
                    Annotate
                  </Button>
                }
              >
                <SidebarField label="ROI">
                  <SidebarValue tone="default">
                    {selectedRoiEntry ? `ROI ${selectedRoiEntry.roi}` : "No ROI selected"}
                  </SidebarValue>
                </SidebarField>
                <SidebarField label="Bounding Box">
                  <SidebarValue>
                    {selectedRoiEntry
                      ? `${selectedRoiEntry.bbox.x}, ${selectedRoiEntry.bbox.y}, ${selectedRoiEntry.bbox.w}, ${selectedRoiEntry.bbox.h}`
                      : "x, y, w, h"}
                  </SidebarValue>
                </SidebarField>
                <SidebarField label="Stack Dimensions">
                  <SidebarValue>
                    {selectedRoiEntry ? selectedRoiEntry.shape.join(" x ") : "T x C x Z x Y x X"}
                  </SidebarValue>
                </SidebarField>
                <SidebarField label="Annotation">
                  <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                    {selectedAnnotationStatus?.annotation?.classificationLabelId ? (
                      <span
                        className="rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={
                          selectedAnnotationLabel
                            ? colorBadgeStyle(selectedAnnotationLabel.color)
                            : undefined
                        }
                      >
                        {selectedAnnotationLabel?.name ?? "Classified"}
                      </span>
                    ) : null}
                    {selectedAnnotationStatus?.annotation?.maskPath ? (
                      <span className="rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-200">
                        Segmentation mask
                      </span>
                    ) : null}
                    {!selectedAnnotationStatus?.annotation?.classificationLabelId &&
                    !selectedAnnotationStatus?.annotation?.maskPath ? (
                      <span className="text-sm text-muted-foreground">No annotation saved</span>
                    ) : null}
                  </div>
                </SidebarField>
                {annotationLabelsState.error ? (
                  <div className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    {annotationLabelsState.error}
                  </div>
                ) : null}
              </SidebarSection>
            </aside>
          </div>
        </main>
      </div>
      {annotationModal && workspacePath ? (
        <RoiAnnotationModal
          workspacePath={workspacePath}
          backend={backend}
          roi={annotationModal.roi}
          request={annotationModal.request}
          frame={annotationModal.frame}
          labels={annotationLabelsState.labels}
          labelsLoading={annotationLabelsState.loading}
          labelsError={annotationLabelsState.error}
          onClose={() => setAnnotationModal(null)}
          onLabelsChange={(labels) =>
            setAnnotationLabelsState({
              labels,
              loading: false,
              error: null,
            })
          }
          onSaved={(annotation) => {
            const requestKey = makeRoiFrameKey(workspacePath, annotationModal.request);
            setAnnotationStatuses((current) => ({
              ...current,
              [requestKey]: {
                requestKey,
                annotation,
                error: null,
                loading: false,
              },
            }));
            setAnnotationModal(null);
          }}
        />
      ) : null}
    </div>
  );
}
