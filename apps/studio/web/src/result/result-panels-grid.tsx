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
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";

const PLOT_MARGINS = {
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

function applyPlotFontSize(root: Element, fontSizePx: number) {
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

function plotOptionsFromChartSpec(spec: ChartSpec): Plot.PlotOptions {
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

function plotOptionsForPanel(panel: ResultPanel): Plot.PlotOptions | null {
  const spec = chartSpecForPanel(panel);
  if (!spec) return null;
  return plotOptionsFromChartSpec(spec);
}

function ObservablePlotView(props: {
  options: Plot.PlotOptions | null;
  title: string;
  class?: string;
}) {
  let containerEl: HTMLDivElement | undefined;
  let hostEl: HTMLDivElement | undefined;
  const [size, setSize] = createSignal({
    width: 0,
    height: 0,
  });

  onMount(() => {
    const node = containerEl;
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
    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    const host = hostEl;
    const options = props.options;
    const { width, height } = size();
    if (!host || !options || width <= 0 || height <= 0) return;
    const figure = Plot.plot({
      ...options,
      width,
      height,
    });
    applyPlotFontSize(figure, PLOT_FONT_SIZE_PX);
    host.replaceChildren(figure);
    onCleanup(() => host.replaceChildren());
  });

  return (
    <Show when={props.options}>
      <div
        ref={containerEl!}
        aria-label={props.title}
        class={props.class ?? "flex min-h-0 flex-1 pointer-events-none select-none text-foreground"}
        role="img"
      >
        <div
          ref={hostEl!}
          class="h-full w-full [&_figure]:m-0 [&_figure]:h-full [&_figure]:w-full [&_svg]:block"
        />
      </div>
    </Show>
  );
}

function ResultPanelView(props: { panel: ResultPanel; class?: string }) {
  const options = () => plotOptionsForPanel(props.panel);
  return <ObservablePlotView class={props.class} options={options()} title={props.panel.title} />;
}

const EXPORT_PAGE_CLASS = "flex flex-col overflow-visible bg-white text-[#171717]";
const EXPORT_TITLE_CLASS =
  "border-b border-[#e5e5e5] px-4 py-3 text-2xl font-semibold text-[#171717]";
const EXPORT_PANEL_TITLE_CLASS = "truncate px-1 text-xl font-semibold text-[#737373]";
const EXPORT_SUBPLOT_CLASS =
  "flex h-full min-h-[300px] pointer-events-none select-none text-[#171717]";

export function ResultPanelsGridView(props: {
  panels: ResultPanel[];
  exportMode?: boolean;
  pageTitle?: string;
  section?: ResultPlotSection;
}) {
  if (props.panels.length === 0) return null;
  const isParameters = () => props.section === "parameters";
  const gridClass = () =>
    isParameters()
      ? "grid grid-cols-1 gap-8 p-4"
      : props.exportMode
        ? "grid grid-cols-2 gap-6 p-4"
        : "grid grid-cols-1 gap-6 p-4 xl:grid-cols-2";
  const cellClass = () =>
    isParameters()
      ? props.exportMode
        ? "flex min-h-[520px] flex-col gap-2"
        : "flex min-h-[560px] flex-col gap-2"
      : props.exportMode
        ? "flex min-h-[360px] flex-col gap-1"
        : "flex min-h-[320px] flex-col gap-1";
  const plotHeightClass = () =>
    isParameters()
      ? props.exportMode
        ? "h-[500px]"
        : "h-[540px]"
      : props.exportMode
        ? "h-[340px]"
        : "min-h-0 flex-1";
  const subplotClass = () =>
    isParameters()
      ? props.exportMode
        ? "flex h-full min-h-[480px] pointer-events-none select-none text-[#171717]"
        : "flex h-full min-h-[480px] pointer-events-none select-none text-foreground"
      : props.exportMode
        ? EXPORT_SUBPLOT_CLASS
        : "flex h-full min-h-[300px] pointer-events-none select-none text-foreground";

  return (
    <div
      class={props.exportMode ? EXPORT_PAGE_CLASS : "flex h-full min-h-0 flex-col overflow-y-auto"}
    >
      <Show when={props.pageTitle}>
        <h2
          class={
            props.exportMode
              ? EXPORT_TITLE_CLASS
              : "border-b px-4 py-3 text-2xl font-semibold text-foreground"
          }
        >
          {props.pageTitle}
        </h2>
      </Show>
      <div class={gridClass()}>
        <For each={props.panels}>
          {(panel) => (
            <div class={cellClass()}>
              <p
                class={
                  props.exportMode
                    ? EXPORT_PANEL_TITLE_CLASS
                    : "truncate px-1 text-xl font-semibold text-muted-foreground"
                }
              >
                {panel.title}
              </p>
              <div class={plotHeightClass()}>
                <ResultPanelView class={subplotClass()} panel={panel} />
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
