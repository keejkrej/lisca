import {
  AlignGrid,
  AlignSelection,
  ContrastControl,
  FrameNavigation,
  Section,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
  type AlignSelectionMode,
  type NavigationOption,
} from "@lisca/ui";
import { useMemo, useState } from "react";

import type { RouteId } from "../types";

const demoPositions = [1, 2, 3, 4];
const demoChannels = [0, 1, 2];
const demoTimeValues = [0, 12, 24, 36, 48];
const demoZValues = [0, 1, 2, 3, 4];
const demoRoiIds = [0, 1, 2, 3, 4, 5, 6, 7];

type AlignGridShape = "hex" | "rect";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function AlignFrameNavigation() {
  const positionOptions = useMemo(() => toNavigationOptions(demoPositions), []);
  const channelOptions = useMemo(() => toNavigationOptions(demoChannels), []);
  const [pos, setPos] = useState(demoPositions[0]!);
  const [channel, setChannel] = useState(demoChannels[0]!);
  const [timeIndex, setTimeIndex] = useState(0);
  const [zIndex, setZIndex] = useState(0);

  const timeMax = Math.max(0, demoTimeValues.length - 1);
  const zMax = Math.max(0, demoZValues.length - 1);
  const posIndex = findNavigationOptionIndex(positionOptions, pos);
  const chIndex = findNavigationOptionIndex(channelOptions, channel);

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

/** Left `AppShell` rail; align vs inspect each show Navigation (`FrameNavigation` includes its section card). */
export function LeftPanel(props: { routeId: RouteId }) {
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      {props.routeId === "align" ? <AlignFrameNavigation /> : <InspectFrameNavigation />}
    </div>
  );
}

const dockContrastDomain = { min: 0, max: 65535 } as const;

/** Dock contrast — local demo state until workspace / frame wiring lands. */
function DockContrastControls() {
  const [contrastMin, setContrastMin] = useState(8000);
  const [contrastMax, setContrastMax] = useState(56_000);

  return (
    <ContrastControl
      aria-label="Contrast"
      domainMax={dockContrastDomain.max}
      domainMin={dockContrastDomain.min}
      maxValue={contrastMax}
      minValue={contrastMin}
      role="region"
      sectionClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      sectionContentClassName="flex min-h-0 flex-1 flex-col overflow-auto"
      onAutoRange={() => {
        setContrastMin(4096);
        setContrastMax(61_440);
      }}
      onMaxCommit={setContrastMax}
      onMinCommit={setContrastMin}
    />
  );
}

/** `AppShell.Dock` content: Contrast only (`ContrastControl`). Selection sits under Grid in the right rail. */
export function BottomPanel({ routeId: _routeId }: { routeId: RouteId }) {
  return (
    <div className="flex h-full min-h-0 w-full p-3">
      <DockContrastControls />
    </div>
  );
}

/** Right rail grid controls — local demo state until workspace wiring lands. */
function AlignGridPanel() {
  const shapeOptions = useMemo<NavigationOption<AlignGridShape>[]>(
    () => [
      { label: "Rectangle", value: "rect" },
      { label: "Hexagon", value: "hex" },
    ],
    [],
  );

  const [overlayVisible, setOverlayVisible] = useState(true);
  const [shape, setShape] = useState<AlignGridShape>("rect");
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [vectorA, setVectorA] = useState(32);
  const [vectorB, setVectorB] = useState(32);
  const [patternWidth, setPatternWidth] = useState(120);
  const [patternHeight, setPatternHeight] = useState(120);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.65);

  const handleReset = () => {
    setOverlayVisible(true);
    setShape("rect");
    setRotationDegrees(0);
    setVectorA(32);
    setVectorB(32);
    setPatternWidth(120);
    setPatternHeight(120);
    setOffsetX(0);
    setOffsetY(0);
    setOverlayOpacity(0.65);
  };

  return (
    <AlignGrid
      patternHeight={patternHeight}
      patternMin={1}
      patternWidth={patternWidth}
      offsetX={offsetX}
      offsetY={offsetY}
      onPatternHeightChange={setPatternHeight}
      onPatternWidthChange={setPatternWidth}
      onOffsetXChange={setOffsetX}
      onOffsetYChange={setOffsetY}
      onOverlayOpacityChange={setOverlayOpacity}
      onOverlayVisibleChange={setOverlayVisible}
      onVectorAChange={setVectorA}
      onVectorBChange={setVectorB}
      onReset={handleReset}
      onRotationDegreesChange={setRotationDegrees}
      onShapeChange={setShape}
      overlayOpacity={overlayOpacity}
      overlayVisible={overlayVisible}
      vectorA={vectorA}
      vectorB={vectorB}
      vectorMin={1}
      rotationDegrees={rotationDegrees}
      shape={shape}
      shapeOptions={shapeOptions}
      sectionClassName="min-h-0 shrink-0"
    />
  );
}

/** Selection below Grid — local demo state until backend wiring lands. */
function AlignSelectionPanel() {
  const [mode, setMode] = useState<AlignSelectionMode>("view");
  const [includedCells, setIncludedCells] = useState(24);
  const [excludedCells, setExcludedCells] = useState(2);

  return (
    <AlignSelection
      autoExcludeDisabled={includedCells <= 0}
      excludedCells={excludedCells}
      excludeAllDisabled={includedCells <= 0}
      excludeEdgeDisabled={includedCells <= 0}
      includedCells={includedCells}
      mode={mode}
      resetDisabled={excludedCells === 0 && includedCells === 24 && mode === "view"}
      sectionClassName="min-h-0 shrink-0"
      sectionContentClassName="flex min-h-0 flex-col overflow-auto"
      onAutoExclude={() => {
        const n = Math.min(4, includedCells);
        if (n <= 0) return;
        setExcludedCells((x) => x + n);
        setIncludedCells((i) => Math.max(0, i - n));
      }}
      onExcludeAll={() => {
        if (includedCells <= 0) return;
        setExcludedCells((x) => x + includedCells);
        setIncludedCells(0);
      }}
      onExcludeEdge={() => {
        if (includedCells <= 0) return;
        setExcludedCells((x) => x + 1);
        setIncludedCells((i) => Math.max(0, i - 1));
      }}
      onModeChange={setMode}
      onReset={() => {
        setIncludedCells(24);
        setExcludedCells(0);
        setMode("view");
      }}
    />
  );
}

/** Center `AppShell` region: viewport / canvas (stub). */
export function MainPanel(props: { routeId: RouteId }) {
  const label = props.routeId === "align" ? "Align canvas" : "Inspect canvas";
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-dashed border-border bg-card/80 px-6 py-10 text-center shadow-sm backdrop-blur-sm">
          <p className="font-medium text-foreground">{label}</p>
          <p className="mt-2 text-muted-foreground text-sm">
            <code className="rounded bg-muted px-1 py-0.5 text-xs">AlignerCanvasSurface</code> and
            backend wiring land here next.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Right `AppShell` rail; align shows Grid then Selection; inspect keeps inspector stub. */
export function RightPanel(props: { routeId: RouteId }) {
  if (props.routeId === "align") {
    return (
      <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
        <AlignGridPanel />
        <AlignSelectionPanel />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <Section description="Stats & metadata — placeholders" title="Inspect inspector">
        <div className="rounded-md border border-dashed border-border px-2 py-10 text-center text-muted-foreground text-xs">
          Inspector stats (stub)
        </div>
      </Section>
    </div>
  );
}
