import * as Plot from "@observablehq/plot";
import {
  BOXPLOT_FILL,
  BOXPLOT_STROKE,
  boxPlotMarginBottom,
  chartSpecForPanel,
  CHART_MARGINS,
  type ChartSpec,
  PLOT_FONT,
  PLOT_FONT_SIZE_PX,
  TIMESERIES_MEDIAN_STROKE,
  TIMESERIES_MEDIAN_WIDTH,
  TRACE_PALETTE,
} from "@lisca/analysis/charts";
import type { ResultPanel, ResultPlotSection } from "@lisca/analysis";
import { useEffect, useRef, useState } from "react";

export { PLOT_FONT_SIZE_PX };

export const PLOT_MARGINS = {
  marginLeft: CHART_MARGINS.left,
  marginBottom: CHART_MARGINS.bottom,
  marginRight: CHART_MARGINS.right,
  marginTop: CHART_MARGINS.top,
} as const;

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
  return {
    style: PLOT_STYLE,
  };
}

function axisFromSpec(axis: ChartSpec["x"] | ChartSpec["y"]): Plot.PlotOptions["x"] {
  return {
    label: axis.label,
    grid: axis.grid,
    tickFormat: axis.tickFormat,
    domain: "domain" in axis ? axis.domain : undefined,
    tickRotate: "tickRotate" in axis ? axis.tickRotate : undefined,
  };
}

export function plotOptionsFromChartSpec(spec: ChartSpec): Plot.PlotOptions {
  if (spec.kind === "timeseries") {
    const traceData = spec.traces.flatMap((trace) =>
      trace.points.map((point) => ({
        x: point.x,
        y: point.y,
        series: trace.key,
      })),
    );
    return {
      ...basePlotOptions(),
      ...PLOT_MARGINS,
      x: axisFromSpec(spec.x),
      y: axisFromSpec(spec.y),
      marks: [
        Plot.lineY(traceData, {
          x: "x",
          y: "y",
          z: "series",
          stroke: spec.traces[0]?.stroke ?? "#9ca3af",
          strokeOpacity: spec.traces[0]?.strokeOpacity ?? 0.3,
        }),
        Plot.lineY(spec.medianTrace, {
          x: "x",
          y: "y",
          stroke: TIMESERIES_MEDIAN_STROKE,
          strokeWidth: TIMESERIES_MEDIAN_WIDTH,
        }),
      ],
    };
  }

  if (spec.kind === "line") {
    const data = spec.series.flatMap((entry) =>
      entry.points.map((point) => ({
        x: point.x,
        y: point.y,
        series: entry.key,
      })),
    );
    return {
      ...basePlotOptions(),
      ...PLOT_MARGINS,
      color: {
        range: [...TRACE_PALETTE],
      },
      x: axisFromSpec(spec.x),
      y: axisFromSpec(spec.y),
      marks: [
        Plot.lineY(data, {
          x: "x",
          y: "y",
          stroke: "series",
          strokeOpacity: spec.series[0]?.strokeOpacity ?? 0.55,
        }),
      ],
    };
  }

  if (spec.kind === "boxplot") {
    const data = spec.groups.flatMap((group) =>
      group.values.map((value) => ({
        group: group.label,
        value,
      })),
    );
    return {
      ...basePlotOptions(),
      ...PLOT_MARGINS,
      marginBottom: boxPlotMarginBottom(spec),
      x: axisFromSpec(spec.x),
      y: axisFromSpec(spec.y),
      marks: [
        Plot.boxY(data, {
          x: "group",
          y: "value",
          fill: BOXPLOT_FILL,
          stroke: BOXPLOT_STROKE,
        }),
      ],
    };
  }

  return {
    ...basePlotOptions(),
    ...PLOT_MARGINS,
    x: axisFromSpec(spec.x),
    y: axisFromSpec(spec.y),
    marks: [
      Plot.rectY(spec.bins, {
        x: "x0",
        x1: "x1",
        y: "count",
      }),
    ],
  };
}

export function plotOptionsForPanel(panel: ResultPanel): Plot.PlotOptions | null {
  const spec = chartSpecForPanel(panel);
  if (!spec) return null;
  return plotOptionsFromChartSpec(spec);
}

function ObservablePlotView(props: {
  options: Plot.PlotOptions | null;
  title: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });
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
  const options = plotOptionsForPanel(panel);
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

export function buildHistogramPlotOptions(panel: Extract<ResultPanel, { kind: "histogram" }>) {
  const spec = chartSpecForPanel(panel);
  if (!spec || spec.kind !== "histogram") return null;
  return plotOptionsFromChartSpec(spec);
}
