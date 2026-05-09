import {
  Button,
  ContrastControl,
  FrameNavigation,
  Section,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
} from "@lisca/ui";
import { useMemo, useState } from "react";

import type { RouteId } from "../types";

const demoPositions = [1, 2, 3, 4];
const demoChannels = [0, 1, 2];
const demoTimeValues = [0, 12, 24, 36, 48];
const demoZValues = [0, 1, 2, 3, 4];
const demoRoiIds = [0, 1, 2, 3, 4, 5, 6, 7];

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
  const displayedTime = demoTimeValues[timeIndex] ?? 0;
  const displayedZ = demoZValues[zIndex] ?? 0;

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
        hint: String(displayedTime),
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
        hint: String(displayedZ),
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
  const displayedTime = demoTimeValues[timeIndex] ?? 0;
  const displayedZ = demoZValues[zIndex] ?? 0;

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
        hint: String(displayedTime),
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
        hint: String(displayedZ),
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

/** `AppShell.Dock` content: Contrast (`ContrastControl` includes its section card) and Save. */
export function BottomPanel(props: { routeId: RouteId }) {
  const saveHint =
    props.routeId === "align"
      ? "Save bbox CSV, grid preset, etc. — stub"
      : "Persist inspect results — stub";

  return (
    <div className="flex h-full min-h-0 w-full gap-2 p-3">
      <DockContrastControls />

      <Section
        aria-label="Save"
        contentClassName="flex min-h-0 flex-1 flex-col items-center justify-center space-y-2"
        role="region"
        title="Save"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <p className="text-center text-muted-foreground text-sm">{saveHint}</p>
        <Button type="button" size="sm" disabled>
          Save
        </Button>
      </Section>
    </div>
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

/** Right `AppShell` rail; content depends on `routeId`. */
export function RightPanel(props: { routeId: RouteId }) {
  const title = props.routeId === "align" ? "Align inspector" : "Inspect inspector";
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <Section title={title} description="Stats & metadata — placeholders">
        <div className="rounded-md border border-dashed border-border px-2 py-10 text-center text-muted-foreground text-xs">
          Inspector stats (stub)
        </div>
      </Section>
    </div>
  );
}
