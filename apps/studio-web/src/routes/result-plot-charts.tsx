import * as Plot from "@observablehq/plot";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type BoxPlotPanel,
  type HistogramPanel,
  type ResultPanel,
} from "./result-plots";

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

const PLOT_STYLE: Plot.PlotOptions["style"] = {
  background: "transparent",
  color: "currentColor",
  fontFamily: "inherit",
};

function basePlotOptions(): Pick<Plot.PlotOptions, "style"> {
  return { style: PLOT_STYLE };
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
    marginLeft: 72,
    marginBottom: 48,
    marginRight: 24,
    marginTop: 16,
    color: { range: TRACE_PALETTE },
    x: { label: props.xAxisLabel, grid: true },
    y: { label: props.yAxisLabel, grid: true },
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
    marginLeft: 72,
    marginBottom: panel.groups.length > 4 ? 96 : 72,
    marginRight: 24,
    marginTop: 16,
    x: {
      label: panel.xAxisLabel,
      domain: panel.groups.map((group) => group.label),
      tickRotate: panel.groups.length > 4 ? -30 : 0,
    },
    y: { label: panel.yAxisLabel, grid: true },
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
    marginLeft: 72,
    marginBottom: 48,
    marginRight: 24,
    marginTop: 16,
    x: { label: panel.xAxisLabel, grid: true },
    y: { label: panel.yAxisLabel, grid: true },
    marks: [Plot.rectY(data, Plot.binX({ y: "count" }, { x: "value" }))],
  };
}

function plotOptionsForPanel(panel: ResultPanel): Plot.PlotOptions | null {
  if (panel.kind === "timeseries") {
    if (panel.traces.length === 0) return null;
    return buildLinePlotOptions({
      xAxisLabel: panel.xAxisLabel,
      yAxisLabel: panel.yAxisLabel,
      series: panel.traces.map((trace) => ({
        key: trace.key,
        points: trace.points,
      })),
    });
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

function ObservablePlotView(props: { options: Plot.PlotOptions | null; title: string }) {
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
    host.replaceChildren(figure);
    return () => host.replaceChildren();
  }, [props.options, size.height, size.width]);

  if (!props.options) return null;

  return (
    <div
      ref={containerRef}
      aria-label={props.title}
      className="flex min-h-0 flex-1 pointer-events-none select-none text-foreground"
      role="img"
    >
      <div
        ref={hostRef}
        className="h-full w-full [&_figure]:m-0 [&_figure]:h-full [&_figure]:w-full [&_svg]:block"
      />
    </div>
  );
}

export function ResultPanelView({ panel }: { panel: ResultPanel }) {
  const options = useMemo(() => plotOptionsForPanel(panel), [panel]);

  return <ObservablePlotView options={options} title={panel.title} />;
}
