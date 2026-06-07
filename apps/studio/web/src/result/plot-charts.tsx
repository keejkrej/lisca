import * as Plot from "@observablehq/plot";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type BoxPlotPanel,
  type HistogramPanel,
  type ResultPanel,
  type ResultPlotSection,
  type TimeseriesPanel,
} from "./plots";

const TRACE_PALETTE = [
  "#60a5fa",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#38bdf8",
];

const PLOT_FONT =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Default Observable Plot font size is 10px; bump for readability. */
export const PLOT_FONT_SIZE_PX = 20;

export const PLOT_MARGINS = {
  marginLeft: 128,
  marginBottom: 96,
  marginRight: 36,
  marginTop: 28,
} as const;

function boxPlotBottomMargin(groupCount: number) {
  return groupCount > 4 ? 176 : 128;
}

const PLOT_STYLE: Plot.PlotOptions["style"] = {
  background: "transparent",
  color: "currentColor",
  fontFamily: PLOT_FONT,
  fontSize: `${PLOT_FONT_SIZE_PX}px`,
};

export function applyPlotFontSize(root: Element, fontSizePx: number) {
  const size = String(fontSizePx);
  const svg = root instanceof SVGSVGElement ? root : root.querySelector("svg");
  if (!svg) return;
  svg.setAttribute("font-size", size);
  for (const node of svg.querySelectorAll("text, tspan")) {
    node.setAttribute("font-size", size);
  }
}

function basePlotOptions(): Pick<Plot.PlotOptions, "style"> {
  return { style: PLOT_STYLE };
}

const Y_AXIS = {
  grid: true,
  tickFormat: ".1e",
} as const;

function yAxis(label: string) {
  return { label, ...Y_AXIS };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function computeMedianTrace(
  traces: Array<{ points: Array<{ x: number; y: number }> }>,
): Array<{ x: number; y: number }> {
  const valuesByX = new Map<number, number[]>();

  for (const trace of traces) {
    for (const point of trace.points) {
      const bucket = valuesByX.get(point.x) ?? [];
      bucket.push(point.y);
      valuesByX.set(point.x, bucket);
    }
  }

  return Array.from(valuesByX.entries())
    .sort(([left], [right]) => left - right)
    .map(([x, values]) => ({ x, y: median(values) }));
}

function buildTimeseriesPlotOptions(panel: TimeseriesPanel): Plot.PlotOptions {
  const traceData = panel.traces.flatMap((trace) =>
    trace.points.map((point) => ({
      x: point.x,
      y: point.y,
      series: trace.key,
    })),
  );
  const medianData = computeMedianTrace(panel.traces);

  return {
    ...basePlotOptions(),
    ...PLOT_MARGINS,
    x: { label: panel.xAxisLabel, grid: true },
    y: yAxis(panel.yAxisLabel),
    marks: [
      Plot.lineY(traceData, {
        x: "x",
        y: "y",
        z: "series",
        stroke: "#9ca3af",
        strokeOpacity: 0.3,
      }),
      Plot.lineY(medianData, {
        x: "x",
        y: "y",
        stroke: "#ef4444",
        strokeWidth: 3,
      }),
    ],
  };
}

function buildLinePlotOptions(props: {
  xAxisLabel: string;
  yAxisLabel: string;
  series: Array<{
    key: string;
    points: Array<{ x: number; y: number }>;
  }>;
}): Plot.PlotOptions {
  const data = props.series.flatMap((entry) =>
    entry.points.map((point) => ({
      x: point.x,
      y: point.y,
      series: entry.key,
    })),
  );

  return {
    ...basePlotOptions(),
    ...PLOT_MARGINS,
    color: { range: TRACE_PALETTE },
    x: { label: props.xAxisLabel, grid: true },
    y: yAxis(props.yAxisLabel),
    marks: [
      Plot.lineY(data, {
        x: "x",
        y: "y",
        stroke: "series",
        strokeOpacity: 0.55,
      }),
    ],
  };
}

function buildBoxPlotOptions(panel: BoxPlotPanel): Plot.PlotOptions {
  const data = panel.groups.flatMap((group) =>
    group.values.map((value) => ({
      group: group.label,
      value,
    })),
  );

  return {
    ...basePlotOptions(),
    ...PLOT_MARGINS,
    marginBottom: boxPlotBottomMargin(panel.groups.length),
    x: {
      label: panel.xAxisLabel,
      domain: panel.groups.map((group) => group.label),
      tickRotate: panel.groups.length > 4 ? -30 : 0,
    },
    y: yAxis(panel.yAxisLabel),
    marks: [
      Plot.boxY(data, {
        x: "group",
        y: "value",
        fill: "#60a5fa33",
        stroke: "#60a5fa",
      }),
    ],
  };
}

export function buildHistogramPlotOptions(panel: HistogramPanel): Plot.PlotOptions {
  const data = panel.values.map((value) => ({ value }));

  return {
    ...basePlotOptions(),
    ...PLOT_MARGINS,
    x: { label: panel.xAxisLabel, grid: true },
    y: yAxis(panel.yAxisLabel),
    marks: [Plot.rectY(data, Plot.binX({ y: "count" }, { x: "value" }))],
  };
}

export function plotOptionsForPanel(panel: ResultPanel): Plot.PlotOptions | null {
  if (panel.kind === "timeseries") {
    if (panel.traces.length === 0) return null;
    return buildTimeseriesPlotOptions(panel);
  }

  if (panel.kind === "boxplot") {
    if (panel.groups.length === 0) return null;
    return buildBoxPlotOptions(panel);
  }

  if (panel.kind === "histogram") {
    if (panel.values.length === 0) return null;
    return buildHistogramPlotOptions(panel);
  }

  if (panel.series.length === 0) return null;

  return buildLinePlotOptions({
    xAxisLabel: panel.xAxisLabel,
    yAxisLabel: panel.yAxisLabel,
    series: panel.series.map((entry) => ({
      key: entry.dataKey,
      points: entry.points,
    })),
  });
}

function ObservablePlotView(props: {
  options: Plot.PlotOptions | null;
  title: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(Math.floor(rect.width), 320),
        height: Math.max(Math.floor(rect.height), 240),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !props.options || size.width <= 0 || size.height <= 0) return;

    const figure = Plot.plot({
      ...props.options,
      width: size.width,
      height: size.height,
    });
    applyPlotFontSize(figure, PLOT_FONT_SIZE_PX);
    host.replaceChildren(figure);
    return () => host.replaceChildren();
  }, [props.options, size.height, size.width]);

  if (!props.options) return null;

  return (
    <div
      ref={containerRef}
      aria-label={props.title}
      className={
        props.className ?? "flex min-h-0 flex-1 pointer-events-none select-none text-foreground"
      }
      role="img"
    >
      <div
        ref={hostRef}
        className="h-full w-full [&_figure]:m-0 [&_figure]:h-full [&_figure]:w-full [&_svg]:block"
      />
    </div>
  );
}

export function ResultPanelView({ panel, className }: { panel: ResultPanel; className?: string }) {
  const options = useMemo(() => plotOptionsForPanel(panel), [panel]);

  return <ObservablePlotView className={className} options={options} title={panel.title} />;
}

const EXPORT_PAGE_CLASS = "flex flex-col overflow-visible bg-white text-[#171717]";
const EXPORT_TITLE_CLASS =
  "border-b border-[#e5e5e5] px-4 py-3 text-2xl font-semibold text-[#171717]";
const EXPORT_PANEL_TITLE_CLASS = "truncate px-1 text-xl font-semibold text-[#737373]";
const EXPORT_SUBPLOT_CLASS =
  "flex h-full min-h-[300px] pointer-events-none select-none text-[#171717]";

export function ResultPanelsGridView({
  panels,
  exportMode = false,
  pageTitle,
  section = "timeseries",
}: {
  panels: ResultPanel[];
  exportMode?: boolean;
  pageTitle?: string;
  section?: ResultPlotSection;
}) {
  if (panels.length === 0) return null;

  const isParameters = section === "parameters";
  const gridClass = isParameters
    ? "grid grid-cols-1 gap-8 p-4"
    : exportMode
      ? "grid grid-cols-2 gap-6 p-4"
      : "grid grid-cols-1 gap-6 p-4 xl:grid-cols-2";
  const cellClass = isParameters
    ? exportMode
      ? "flex min-h-[520px] flex-col gap-2"
      : "flex min-h-[560px] flex-col gap-2"
    : exportMode
      ? "flex min-h-[360px] flex-col gap-1"
      : "flex min-h-[320px] flex-col gap-1";
  const plotHeightClass = isParameters
    ? exportMode
      ? "h-[500px]"
      : "h-[540px]"
    : exportMode
      ? "h-[340px]"
      : "min-h-0 flex-1";
  const subplotClass = isParameters
    ? exportMode
      ? "flex h-full min-h-[480px] pointer-events-none select-none text-[#171717]"
      : "flex h-full min-h-[480px] pointer-events-none select-none text-foreground"
    : exportMode
      ? EXPORT_SUBPLOT_CLASS
      : "flex h-full min-h-[300px] pointer-events-none select-none text-foreground";

  return (
    <div
      className={exportMode ? EXPORT_PAGE_CLASS : "flex h-full min-h-0 flex-col overflow-y-auto"}
    >
      {pageTitle ? (
        <h2
          className={
            exportMode
              ? EXPORT_TITLE_CLASS
              : "border-b px-4 py-3 text-2xl font-semibold text-foreground"
          }
        >
          {pageTitle}
        </h2>
      ) : null}
      <div className={gridClass}>
        {panels.map((panel) => (
          <div key={`${panel.path}:${panel.kind}:${panel.title}`} className={cellClass}>
            <p
              className={
                exportMode
                  ? EXPORT_PANEL_TITLE_CLASS
                  : "truncate px-1 text-xl font-semibold text-muted-foreground"
              }
            >
              {panel.title}
            </p>
            <div className={plotHeightClass}>
              <ResultPanelView className={subplotClass} panel={panel} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
