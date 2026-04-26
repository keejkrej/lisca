import { useEffect, useMemo, useRef, useState } from "react";
import { useScanRoiWorkspaceQuery } from "lisca/shared/query";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type {
  FrameResult,
  RoiFrameRequest,
  RoiIndexEntry,
  RoiPositionScan,
  ViewerCanvasStatusMessage,
  ViewerSource,
  ViewerDataPort,
} from "lisca/shared/contracts";
import { clamp, createDefaultGrid, normalizeGridState, type GridState } from "lisca/shared/core";
import { ViewerCanvasSurface } from "../alignment";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "lisca/shared/ui";
import {
  findNavigationOptionIndex,
  NavigationControls,
  showErrorToast,
  SidebarField,
  SidebarSection,
  SidebarValue,
  toNavigationOptions,
  useSyncRoiWorkspaceQueryToRoiStore,
} from "lisca/shared/react";
import {
  resetRoiState,
  roiStore,
  setRoiPageIndex,
  setRoiSelectionKey,
  setSelectedRoi,
} from "lisca/shared/state";

import { useRoiVisibleTileFrames, type RoiWorkspaceTileState } from "../hooks/useRoiVisibleTileFrames";
import ViewerNavbar, { type ViewerMode } from "./ViewerNavbar";

type SelectValue = number | string;

type Option<T extends SelectValue> = {
  label: string;
  value: T;
};

interface ViewerRoiWorkspaceProps {
  workspacePath: string | null;
  source: ViewerSource | null;
  backend: ViewerDataPort;
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  onPickWorkspace: () => Promise<void>;
  onOpenTif: () => Promise<void>;
  onOpenJpg: () => Promise<void>;
  onOpenNd2: () => Promise<void>;
  onOpenCzi: () => Promise<void>;
  onClearSource: () => void;
}

interface CachedFrame {
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

function RoiTile({
  roi,
  tileState,
  selected,
  onSelect,
  grid,
}: {
  roi: RoiIndexEntry;
  tileState: RoiWorkspaceTileState | undefined;
  selected: boolean;
  onSelect: () => void;
  grid: GridState;
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
    >
      <div className="min-h-0 flex-1 overflow-hidden rounded-[1.125rem] border border-border/60 bg-black/10">
        <ViewerCanvasSurface
          className="h-full w-full"
          frame={tileState?.frame ?? null}
          grid={grid}
          loading={tileState?.loading ?? false}
          emptyText="No ROI frame"
          messages={messages}
        />
      </div>
    </div>
  );
}

export default function ViewerRoiWorkspace({
  workspacePath,
  source,
  backend,
  mode,
  onModeChange,
  onPickWorkspace,
  onOpenTif,
  onOpenJpg,
  onOpenNd2,
  onOpenCzi,
  onClearSource,
}: ViewerRoiWorkspaceProps) {
  const frameCacheRef = useRef(new FrameCache());
  const lastWorkspaceErrorToastRef = useRef<string | null>(null);
  const [tileStates, setTileStates] = useState<Record<number, RoiWorkspaceTileState>>({});
  const [tileGrid, setTileGrid] = useState<GridState>(() =>
    normalizeGridState({ ...ROI_TILE_GRID }),
  );
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

  const roiWorkspaceQuery = useScanRoiWorkspaceQuery(backend, workspacePath);

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
    if (!workspacePath) {
      resetRoiState();
      setTileStates({});
    }
  }, [workspacePath]);

  useSyncRoiWorkspaceQueryToRoiStore(workspacePath, roiWorkspaceQuery);

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
    () => toNavigationOptions(scan?.positions.map((entry) => entry.pos) ?? []),
    [scan],
  );
  const channelOptions = useMemo(() => toNavigationOptions(position?.channels ?? []), [position]);
  const zValues = position?.zSlices ?? [];
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
  const timeValues = position?.times ?? [];
  const selectedTimeIndex = useMemo(() => {
    if (!selection) return 0;
    const index = timeValues.indexOf(selection.time);
    return index >= 0 ? index : 0;
  }, [selection, timeValues]);
  const [timeSliderIndex, setTimeSliderIndexValue] = useState(0);
  const [zSliderIndex, setZSliderIndexValue] = useState(0);
  const timeSliderMax = Math.max(0, timeValues.length - 1);
  const zSliderMax = Math.max(0, zValues.length - 1);
  const displayedTime = timeValues[timeSliderIndex] ?? selection?.time ?? 0;
  const displayedZ = zValues[zSliderIndex] ?? selection?.z ?? 0;
  const controlsDisabled = !selection || !position || roiEntries.length === 0;
  const hasRoiPositions = Boolean(scan && scan.positions.length > 0);
  const pageOptions = useMemo(
    () => toNavigationOptions(Array.from({ length: pageCount }, (_, index) => index + 1)),
    [pageCount],
  );
  const selectedPage = boundedPageIndex + 1;
  const selectedPageIndex = findNavigationOptionIndex(pageOptions, selectedPage);
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
    setZSliderIndexValue(selectedZIndex);
  }, [selectedZIndex]);

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

  useRoiVisibleTileFrames({
    backend,
    workspacePath,
    visibleRoiRequests,
    visibleRequestSignature,
    frameCacheRef,
    setTileStates,
  });

  const emptyText = useMemo(() => {
    if (loading) return "Scanning workspace ROI output...";
    if (error) return error;
    return null;
  }, [error, loading]);

  return (
    <div className="h-full min-h-0 min-w-0 overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-h-0 flex-col">
        <ViewerNavbar
          workspacePath={workspacePath}
          source={source}
          mode={mode}
          onModeChange={onModeChange}
          onPickWorkspace={onPickWorkspace}
          onOpenTif={onOpenTif}
          onOpenJpg={onOpenJpg}
          onOpenNd2={onOpenNd2}
          onOpenCzi={onOpenCzi}
          onClearSource={onClearSource}
        />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="grid h-full min-h-0 min-w-0 grid-cols-[18rem_minmax(0,1fr)_18rem] items-stretch">
            <aside className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden divide-y divide-border border-r border-border px-5 py-4">
              <SidebarSection title="ROI Stack">
                <NavigationControls
                  position={{
                    value: selection?.pos ?? (positionOptions[0]?.value ?? 0),
                    options: positionOptions,
                    disabled: !hasRoiPositions || !selection,
                    onChange: (value) => setRoiSelectionKey("pos", value),
                    previousDisabled: !hasRoiPositions || !selection || selectedPositionIndex <= 0,
                    nextDisabled:
                      !hasRoiPositions || !selection || selectedPositionIndex >= positionOptions.length - 1,
                    onPrevious: () => {
                      const nextValue = positionOptions[selectedPositionIndex - 1]?.value;
                      if (nextValue != null && nextValue !== selection?.pos) {
                        setRoiSelectionKey("pos", nextValue);
                      }
                    },
                    onNext: () => {
                      const nextValue = positionOptions[selectedPositionIndex + 1]?.value;
                      if (nextValue != null && nextValue !== selection?.pos) {
                        setRoiSelectionKey("pos", nextValue);
                      }
                    },
                  }}
                  channel={{
                    value: selection?.channel ?? (channelOptions[0]?.value ?? 0),
                    options: channelOptions,
                    disabled: controlsDisabled,
                    onChange: (value) => setRoiSelectionKey("channel", value),
                    previousDisabled: controlsDisabled || selectedChannelIndex <= 0,
                    nextDisabled: controlsDisabled || selectedChannelIndex >= channelOptions.length - 1,
                    onPrevious: () => {
                      const nextValue = channelOptions[selectedChannelIndex - 1]?.value;
                      if (nextValue != null && nextValue !== selection?.channel) {
                        setRoiSelectionKey("channel", nextValue);
                      }
                    },
                    onNext: () => {
                      const nextValue = channelOptions[selectedChannelIndex + 1]?.value;
                      if (nextValue != null && nextValue !== selection?.channel) {
                        setRoiSelectionKey("channel", nextValue);
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
                    onChange: (nextIndex) =>
                      setTimeSliderIndexValue(clamp(Math.round(nextIndex), 0, timeSliderMax)),
                    onCommit: (nextIndex) => {
                      const rounded = clamp(Math.round(nextIndex), 0, timeSliderMax);
                      setTimeSliderIndexValue(rounded);
                      const nextTime = timeValues[rounded];
                      if (nextTime != null && nextTime !== selection?.time) {
                        setRoiSelectionKey("time", nextTime);
                      }
                    },
                    previousDisabled: controlsDisabled || timeValues.length <= 1 || timeSliderIndex <= 0,
                    nextDisabled: controlsDisabled || timeValues.length <= 1 || timeSliderIndex >= timeSliderMax,
                    onPrevious: () => {
                      const nextIndex = Math.max(0, timeSliderIndex - 1);
                      setTimeSliderIndexValue(nextIndex);
                      const nextTime = timeValues[nextIndex];
                      if (nextTime != null && nextTime !== selection?.time) {
                        setRoiSelectionKey("time", nextTime);
                      }
                    },
                    onNext: () => {
                      const nextIndex = Math.min(timeSliderMax, timeSliderIndex + 1);
                      setTimeSliderIndexValue(nextIndex);
                      const nextTime = timeValues[nextIndex];
                      if (nextTime != null && nextTime !== selection?.time) {
                        setRoiSelectionKey("time", nextTime);
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
                    onChange: (nextIndex) =>
                      setZSliderIndexValue(clamp(Math.round(nextIndex), 0, zSliderMax)),
                    onCommit: (nextIndex) => {
                      const rounded = clamp(Math.round(nextIndex), 0, zSliderMax);
                      setZSliderIndexValue(rounded);
                      const nextZ = zValues[rounded];
                      if (nextZ != null && nextZ !== selection?.z) {
                        setRoiSelectionKey("z", nextZ);
                      }
                    },
                    previousDisabled: controlsDisabled || zValues.length <= 1 || zSliderIndex <= 0,
                    nextDisabled: controlsDisabled || zValues.length <= 1 || zSliderIndex >= zSliderMax,
                    onPrevious: () => {
                      const nextIndex = Math.max(0, zSliderIndex - 1);
                      setZSliderIndexValue(nextIndex);
                      const nextZ = zValues[nextIndex];
                      if (nextZ != null && nextZ !== selection?.z) {
                        setRoiSelectionKey("z", nextZ);
                      }
                    },
                    onNext: () => {
                      const nextIndex = Math.min(zSliderMax, zSliderIndex + 1);
                      setZSliderIndexValue(nextIndex);
                      const nextZ = zValues[nextIndex];
                      if (nextZ != null && nextZ !== selection?.z) {
                        setRoiSelectionKey("z", nextZ);
                      }
                    },
                  }}
                />
                <SidebarField label="Page">
                  <AppSelect
                    value={selectedPage}
                    options={pageOptions}
                    disabled={controlsDisabled || pageCount <= 1}
                    onChange={(value) => setRoiPageIndex(value - 1)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={controlsDisabled || selectedPageIndex <= 0}
                      onClick={() => setRoiPageIndex((current) => Math.max(0, current - 1))}
                    >
                      {"<"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={controlsDisabled || selectedPageIndex >= pageOptions.length - 1}
                      onClick={() => setRoiPageIndex((current) => Math.min(pageCount - 1, current + 1))}
                    >
                      {">"}
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
                            grid={tileGrid}
                            tileState={tileStates[roi.roi]}
                            selected={selectedRoi === roi.roi}
                            onSelect={() => setSelectedRoi(roi.roi)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden divide-y divide-border border-l border-border px-5 py-4">
              <SidebarSection title="Tile overlay">
                <SidebarField label="Grid">
                  <Button
                    size="sm"
                    variant={tileGrid.enabled ? "default" : "outline"}
                    className="h-9 w-full text-xs"
                    onClick={() =>
                      setTileGrid((current) =>
                        normalizeGridState({ ...current, enabled: !current.enabled }),
                      )
                    }
                  >
                    {tileGrid.enabled ? "Grid on" : "Grid off"}
                  </Button>
                </SidebarField>
                <SidebarField label="Opacity" hint={tileGrid.opacity.toFixed(2)}>
                  <Slider
                    value={tileGrid.opacity}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={!tileGrid.enabled}
                    onValueChange={(value) =>
                      setTileGrid((current) =>
                        normalizeGridState({ ...current, opacity: clamp(value, 0, 1) }),
                      )
                    }
                  />
                </SidebarField>
              </SidebarSection>

              <SidebarSection title="Tiles">
                <p className="text-xs text-muted-foreground">
                  Up to nine ROI previews per page. Use ROI Stack and Page on the left to change
                  position, channel, time, Z, and which ROIs are shown.
                </p>
              </SidebarSection>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
