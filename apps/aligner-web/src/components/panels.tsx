import type {
  AlignGridCellCoord,
  AlignGridShape,
  AlignGridState,
  FrameResult,
} from "@lisca/contracts";
import {
  AlignCanvasSurface,
  AlignGrid,
  AlignSelection,
  ContrastControl,
  FrameNavigation,
  Section,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
  type AlignCanvasFramePoint,
  type AlignCanvasPointerEvent,
  type AlignCanvasWheelEvent,
  type AlignSelectionMode,
  type NavigationOption,
} from "@lisca/ui";
import {
  applyAlignGridPointerGesture,
  applyAlignGridWheelGesture,
  beginAlignGridPointerGesture,
  collectAlignGridEdgeCells,
  collectAlignGridStrokeToggleCells,
  countVisibleAlignGridCells,
  createDefaultAlignGrid,
  degreesToRadians,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  normalizeAlignGridState,
  radiansToDegrees,
  setExcludedAlignGridCellsForPosition,
  toggleExcludedAlignGridCells,
  type AlignGridPointerGestureSession,
} from "@lisca/utils";
import { useCallback, useMemo, useRef, useState } from "react";

import type { RouteId } from "../types";

const demoPositions = [1, 2, 3, 4];
const demoChannels = [0, 1, 2];
const demoTimeValues = [0, 12, 24, 36, 48];
const demoZValues = [0, 1, 2, 3, 4];
const demoRoiIds = [0, 1, 2, 3, 4, 5, 6, 7];

type ExcludedByPosition = Record<number, AlignGridCellCoord[]>;
const emptyExcludedCells: AlignGridCellCoord[] = [];

export type AlignDemoState = {
  pos: number;
  setPos: (value: number) => void;
  channel: number;
  setChannel: (value: number) => void;
  timeIndex: number;
  setTimeIndex: (value: number | ((current: number) => number)) => void;
  zIndex: number;
  setZIndex: (value: number | ((current: number) => number)) => void;
  contrastMin: number;
  setContrastMin: (value: number) => void;
  contrastMax: number;
  setContrastMax: (value: number) => void;
  grid: AlignGridState;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  selectionMode: AlignSelectionMode;
  setSelectionMode: (mode: AlignSelectionMode) => void;
  excludedCellsByPosition: ExcludedByPosition;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  toggleExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  frame: FrameResult | null;
  currentExcludedCells: AlignGridCellCoord[];
  visibleCounts: { included: number; excluded: number };
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function useAlignDemoState(): AlignDemoState {
  const [pos, setPos] = useState(demoPositions[0]!);
  const [channel, setChannel] = useState(demoChannels[0]!);
  const [timeIndex, setTimeIndex] = useState(0);
  const [zIndex, setZIndex] = useState(0);
  const [contrastMin, setContrastMin] = useState(0);
  const [contrastMax, setContrastMax] = useState(255);
  const [grid, setGridRaw] = useState(() => normalizeAlignGridState(createDefaultAlignGrid()));
  const [selectionMode, setSelectionMode] = useState<AlignSelectionMode>("view");
  const [excludedCellsByPosition, setExcludedCellsByPosition] = useState<ExcludedByPosition>({});

  const frame = null;
  const currentExcludedCells = useMemo(
    () => excludedCellsByPosition[pos] ?? emptyExcludedCells,
    [excludedCellsByPosition, pos],
  );
  const visibleCounts = useMemo(
    () =>
      frame
        ? countVisibleAlignGridCells(frame, grid, currentExcludedCells)
        : { included: 0, excluded: 0 },
    [currentExcludedCells, frame, grid],
  );

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
        setExcludedAlignGridCellsForPosition(current, pos, cells),
      );
    },
    [pos],
  );

  const toggleExcludedCellsForCurrentPosition = useCallback(
    (cells: Iterable<AlignGridCellCoord>) => {
      setExcludedCellsByPosition((current) =>
        setExcludedAlignGridCellsForPosition(
          current,
          pos,
          toggleExcludedAlignGridCells(current[pos] ?? emptyExcludedCells, cells),
        ),
      );
    },
    [pos],
  );

  return {
    pos,
    setPos,
    channel,
    setChannel,
    timeIndex,
    setTimeIndex,
    zIndex,
    setZIndex,
    contrastMin,
    setContrastMin,
    contrastMax,
    setContrastMax,
    grid,
    setGrid,
    selectionMode,
    setSelectionMode,
    excludedCellsByPosition,
    setExcludedCellsForCurrentPosition,
    toggleExcludedCellsForCurrentPosition,
    frame,
    currentExcludedCells,
    visibleCounts,
  };
}

function AlignFrameNavigation({ state }: { state: AlignDemoState }) {
  const positionOptions = useMemo(() => toNavigationOptions(demoPositions), []);
  const channelOptions = useMemo(() => toNavigationOptions(demoChannels), []);

  const timeMax = Math.max(0, demoTimeValues.length - 1);
  const zMax = Math.max(0, demoZValues.length - 1);
  const posIndex = findNavigationOptionIndex(positionOptions, state.pos);
  const chIndex = findNavigationOptionIndex(channelOptions, state.channel);

  return (
    <FrameNavigation
      position={{
        value: state.pos,
        options: positionOptions,
        disabled: false,
        onChange: state.setPos,
        previousDisabled: posIndex <= 0,
        nextDisabled: posIndex >= positionOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions, state.pos, -1);
          if (next != null) state.setPos(next);
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions, state.pos, 1);
          if (next != null) state.setPos(next);
        },
      }}
      channel={{
        value: state.channel,
        options: channelOptions,
        disabled: false,
        onChange: state.setChannel,
        previousDisabled: chIndex <= 0,
        nextDisabled: chIndex >= channelOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions, state.channel, -1);
          if (next != null) state.setChannel(next);
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions, state.channel, 1);
          if (next != null) state.setChannel(next);
        },
      }}
      timepoint={{
        value: state.timeIndex,
        min: 0,
        max: timeMax,
        step: 1,
        disabled: demoTimeValues.length <= 1,
        onChange: (i: number) => state.setTimeIndex(clamp(Math.round(i), 0, timeMax)),
        onCommit: (i: number) => state.setTimeIndex(clamp(Math.round(i), 0, timeMax)),
        previousDisabled: demoTimeValues.length <= 1 || state.timeIndex <= 0,
        nextDisabled: demoTimeValues.length <= 1 || state.timeIndex >= timeMax,
        onPrevious: () => state.setTimeIndex((t) => Math.max(0, t - 1)),
        onNext: () => state.setTimeIndex((t) => Math.min(timeMax, t + 1)),
      }}
      zPlane={{
        value: state.zIndex,
        min: 0,
        max: zMax,
        step: 1,
        disabled: demoZValues.length <= 1,
        onChange: (i: number) => state.setZIndex(clamp(Math.round(i), 0, zMax)),
        onCommit: (i: number) => state.setZIndex(clamp(Math.round(i), 0, zMax)),
        previousDisabled: demoZValues.length <= 1 || state.zIndex <= 0,
        nextDisabled: demoZValues.length <= 1 || state.zIndex >= zMax,
        onPrevious: () => state.setZIndex((z) => Math.max(0, z - 1)),
        onNext: () => state.setZIndex((z) => Math.min(zMax, z + 1)),
      }}
    />
  );
}

function InspectFrameNavigation() {
  const positionOptions = useMemo(() => toNavigationOptions(demoPositions), []);
  const channelOptions = useMemo(() => toNavigationOptions(demoChannels), []);
  const roiOptions = useMemo(() => toNavigationOptions(demoRoiIds), []);
  const [pos, setPos] = useState(demoPositions[0]!);
  const [channel, setChannel] = useState(demoChannels[0]!);
  const [roi, setRoi] = useState(demoRoiIds[0]!);
  const [timeIndex, setTimeIndex] = useState(0);
  const [zIndex, setZIndex] = useState(0);

  const timeMax = Math.max(0, demoTimeValues.length - 1);
  const zMax = Math.max(0, demoZValues.length - 1);
  const posIndex = findNavigationOptionIndex(positionOptions, pos);
  const chIndex = findNavigationOptionIndex(channelOptions, channel);
  const roiIndex = findNavigationOptionIndex(roiOptions, roi);

  return (
    <FrameNavigation
      position={{
        value: pos,
        options: positionOptions,
        disabled: false,
        onChange: setPos,
        previousDisabled: posIndex <= 0,
        nextDisabled: posIndex >= positionOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions, pos, -1);
          if (next != null) setPos(next);
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions, pos, 1);
          if (next != null) setPos(next);
        },
      }}
      channel={{
        value: channel,
        options: channelOptions,
        disabled: false,
        onChange: setChannel,
        previousDisabled: chIndex <= 0,
        nextDisabled: chIndex >= channelOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions, channel, -1);
          if (next != null) setChannel(next);
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions, channel, 1);
          if (next != null) setChannel(next);
        },
      }}
      roi={{
        value: roi,
        options: roiOptions,
        disabled: false,
        onChange: setRoi,
        previousDisabled: roiIndex <= 0,
        nextDisabled: roiIndex >= roiOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(roiOptions, roi, -1);
          if (next != null) setRoi(next);
        },
        onNext: () => {
          const next = stepNavigationValue(roiOptions, roi, 1);
          if (next != null) setRoi(next);
        },
      }}
      timepoint={{
        value: timeIndex,
        min: 0,
        max: timeMax,
        step: 1,
        disabled: demoTimeValues.length <= 1,
        onChange: (i: number) => setTimeIndex(clamp(Math.round(i), 0, timeMax)),
        onCommit: (i: number) => setTimeIndex(clamp(Math.round(i), 0, timeMax)),
        previousDisabled: demoTimeValues.length <= 1 || timeIndex <= 0,
        nextDisabled: demoTimeValues.length <= 1 || timeIndex >= timeMax,
        onPrevious: () => setTimeIndex((t) => Math.max(0, t - 1)),
        onNext: () => setTimeIndex((t) => Math.min(timeMax, t + 1)),
      }}
      zPlane={{
        value: zIndex,
        min: 0,
        max: zMax,
        step: 1,
        disabled: demoZValues.length <= 1,
        onChange: (i: number) => setZIndex(clamp(Math.round(i), 0, zMax)),
        onCommit: (i: number) => setZIndex(clamp(Math.round(i), 0, zMax)),
        previousDisabled: demoZValues.length <= 1 || zIndex <= 0,
        nextDisabled: demoZValues.length <= 1 || zIndex >= zMax,
        onPrevious: () => setZIndex((z) => Math.max(0, z - 1)),
        onNext: () => setZIndex((z) => Math.min(zMax, z + 1)),
      }}
    />
  );
}

export function LeftPanel(props: { routeId: RouteId; alignDemo?: AlignDemoState }) {
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      {props.routeId === "align" && props.alignDemo ? (
        <>
          <AlignFrameNavigation state={props.alignDemo} />
          <DockContrastControls state={props.alignDemo} />
        </>
      ) : (
        <InspectFrameNavigation />
      )}
    </div>
  );
}

function DockContrastControls({ state }: { state: AlignDemoState }) {
  return (
    <ContrastControl
      aria-label="Contrast"
      domainMax={255}
      domainMin={0}
      maxValue={state.contrastMax}
      minValue={state.contrastMin}
      role="region"
      sectionClassName="min-h-0 shrink-0"
      sectionContentClassName="flex min-h-0 flex-col overflow-auto"
      onAutoRange={() => {
        state.setContrastMin(24);
        state.setContrastMax(232);
      }}
      onMaxCommit={state.setContrastMax}
      onMinCommit={state.setContrastMin}
    />
  );
}

export function BottomPanel(props: { routeId: RouteId; alignDemo?: AlignDemoState }) {
  return (
    <div className="flex h-full min-h-0 w-full p-3">
      {props.routeId === "align" && props.alignDemo ? (
        <DockContrastControls state={props.alignDemo} />
      ) : (
        <Section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" title="Contrast">
          <p className="text-muted-foreground text-xs">Inspect contrast controls land here next.</p>
        </Section>
      )}
    </div>
  );
}

function AlignGridPanel({ state }: { state: AlignDemoState }) {
  const shapeOptions = useMemo<NavigationOption<AlignGridShape>[]>(
    () => [
      { label: "Rectangle", value: "rect" },
      { label: "Hexagon", value: "hex" },
    ],
    [],
  );

  const updateGrid = (patch: Partial<AlignGridState>) => {
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
      onReset={() => state.setGrid(createDefaultAlignGrid())}
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

function AlignSelectionPanel({ state }: { state: AlignDemoState }) {
  const visibleCells = useMemo(
    () =>
      state.frame
        ? enumerateVisibleAlignGridCells(state.frame, state.grid).map(({ i, j }) => ({ i, j }))
        : [],
    [state.frame, state.grid],
  );
  const hasVisibleCells = visibleCells.length > 0;
  const hasExcludedCells = state.currentExcludedCells.length > 0;

  return (
    <AlignSelection
      autoExcludeDisabled
      excludedCells={state.visibleCounts.excluded}
      excludeAllDisabled={!hasVisibleCells}
      excludeEdgeDisabled={!hasVisibleCells}
      includedCells={state.visibleCounts.included}
      mode={state.selectionMode}
      resetDisabled={!hasExcludedCells && state.selectionMode === "view"}
      sectionClassName="min-h-0 shrink-0"
      sectionContentClassName="flex min-h-0 flex-col overflow-auto"
      onExcludeAll={() => state.setExcludedCellsForCurrentPosition(visibleCells)}
      onExcludeEdge={() => {
        if (!state.frame) return;
        const edgeCells = collectAlignGridEdgeCells(state.frame, state.grid);
        state.setExcludedCellsForCurrentPosition(
          mergeExcludedAlignGridCells(state.currentExcludedCells, edgeCells),
        );
      }}
      onModeChange={state.setSelectionMode}
      onReset={() => {
        state.setExcludedCellsForCurrentPosition([]);
        state.setSelectionMode("view");
      }}
    />
  );
}

function useAlignCanvasHandlers(state: AlignDemoState) {
  const gestureRef = useRef<AlignGridPointerGestureSession | null>(null);
  const strokeRef = useRef<{
    lastPoint: AlignCanvasFramePoint;
    toggledCells: AlignGridCellCoord[];
  } | null>(null);

  const toggleStrokeCells = useCallback(
    (cells: AlignGridCellCoord[]) => {
      if (cells.length === 0) return;
      state.toggleExcludedCellsForCurrentPosition(cells);
    },
    [state],
  );

  const handlePointerDown = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (!event.viewport) return;

      if (state.selectionMode === "edit") {
        if (event.pointerType !== "mouse" || event.button !== 0 || !event.framePoint) return;
        if (!state.frame) return;
        event.preventDefault();
        event.capturePointer();
        const cells = collectAlignGridStrokeToggleCells(
          state.frame,
          state.grid,
          event.framePoint,
          event.framePoint,
        );
        strokeRef.current = { lastPoint: event.framePoint, toggledCells: cells };
        toggleStrokeCells(cells);
        return;
      }

      const session = beginAlignGridPointerGesture(state.grid, event);
      if (!session) return;
      event.preventDefault();
      event.capturePointer();
      gestureRef.current = session;
    },
    [state, toggleStrokeCells],
  );

  const handlePointerMove = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (state.selectionMode === "edit") {
        const stroke = strokeRef.current;
        if (!stroke || !event.framePoint || (event.buttons & 1) === 0) return;
        if (!state.frame) return;
        event.preventDefault();
        const cells = collectAlignGridStrokeToggleCells(
          state.frame,
          state.grid,
          stroke.lastPoint,
          event.framePoint,
          stroke.toggledCells,
        );
        stroke.lastPoint = event.framePoint;
        stroke.toggledCells = [...stroke.toggledCells, ...cells];
        toggleStrokeCells(cells);
        return;
      }

      const gesture = gestureRef.current;
      if (!gesture || !event.viewport || gesture.pointerId !== event.pointerId) return;
      event.preventDefault();
      state.setGrid(applyAlignGridPointerGesture(gesture, event, event.viewport));
    },
    [state, toggleStrokeCells],
  );

  const handlePointerEnd = useCallback((event: AlignCanvasPointerEvent) => {
    if (gestureRef.current?.pointerId === event.pointerId) {
      gestureRef.current = null;
    }
    strokeRef.current = null;
    event.releasePointer();
  }, []);

  const handleWheel = useCallback(
    (event: AlignCanvasWheelEvent) => {
      if (state.selectionMode !== "view" || !event.viewport) return;
      event.preventDefault();
      state.setGrid(applyAlignGridWheelGesture(state.grid, event, event.viewport));
    },
    [state],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handleWheel,
  };
}

function AlignCanvasPanel({ state }: { state: AlignDemoState }) {
  const { handlePointerDown, handlePointerMove, handlePointerEnd, handleWheel } =
    useAlignCanvasHandlers(state);

  if (!state.frame) {
    return <div className="flex h-full min-h-0 flex-col bg-zinc-950" />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <AlignCanvasSurface
        className="min-h-0 flex-1"
        cursor={state.selectionMode === "edit" ? "crosshair" : "grab"}
        excludedCells={state.currentExcludedCells}
        frame={state.frame}
        grid={state.grid}
        onVirtualPointerCancel={handlePointerEnd}
        onVirtualPointerDown={handlePointerDown}
        onVirtualPointerMove={handlePointerMove}
        onVirtualPointerUp={handlePointerEnd}
        onVirtualWheel={handleWheel}
      />
    </div>
  );
}

export function MainPanel(props: { routeId: RouteId; alignDemo?: AlignDemoState }) {
  if (props.routeId !== "align" || !props.alignDemo) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-muted/20">
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <div className="max-w-md rounded-lg border border-dashed border-border bg-card/80 px-6 py-10 text-center shadow-sm backdrop-blur-sm">
            <p className="font-medium text-foreground">Inspect canvas</p>
            <p className="mt-2 text-muted-foreground text-sm">
              Inspector canvas wiring lands here next.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <AlignCanvasPanel state={props.alignDemo} />;
}

export function RightPanel(props: { routeId: RouteId; alignDemo?: AlignDemoState }) {
  if (props.routeId === "align" && props.alignDemo) {
    return (
      <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
        <AlignGridPanel state={props.alignDemo} />
        <AlignSelectionPanel state={props.alignDemo} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <Section description="Stats & metadata placeholders" title="Inspect inspector">
        <div className="rounded-md border border-dashed border-border px-2 py-10 text-center text-muted-foreground text-xs">
          Inspector stats (stub)
        </div>
      </Section>
    </div>
  );
}
