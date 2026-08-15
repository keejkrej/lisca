import { bin } from "d3-array";
import type {
  BoxPlotPanel,
  GenericLinePanel,
  HistogramPanel,
  ResultPanel,
  TimeseriesPanel,
} from "../shared/panels";
import {
  BOXPLOT_STROKE,
  boxPlotBottomMargin,
  boxPlotTickRotate,
  GENERIC_LINE_OPACITY,
  GENERIC_LINE_WIDTH,
  TIMESERIES_TRACE_OPACITY,
  TIMESERIES_TRACE_STROKE,
  traceColor,
  Y_AXIS_TICK_FORMAT,
} from "./theme";
import type {
  AxisSpec,
  BoxPlotChartSpec,
  ChartSpec,
  GenericLineChartSpec,
  HistogramChartSpec,
  TimeseriesChartSpec,
} from "./spec";
import { computeMedianTrace } from "./scales";

const HISTOGRAM_BIN_COUNT = 20;

function yAxisForLabel(label: string, scale?: "linear" | "log"): AxisSpec {
  switch (label) {
    case "P(dead)":
      return { label, grid: true, tickFormat: ".2f", numericDomain: [0, 1] };
    case "N(alive)":
    case "n crops":
      return { label, grid: true, tickFormat: "d" };
    case "onset time":
      return { label, grid: true, tickFormat: ".0f" };
    case "mRNA lifetime":
    case "protein lifetime":
      return { label, grid: true, tickFormat: ".1f" };
    case "expression rate":
      return { label, grid: true, tickFormat: ".1e", type: scale ?? "log" };
    case "AUC":
    case "intensity":
    case "mask area":
    case "baseline intensity":
      return { label, grid: true, tickFormat: ".2s" };
    default:
      return { label, grid: true, tickFormat: Y_AXIS_TICK_FORMAT, type: scale };
  }
}

function xAxisMinutes(label: string, domain?: [number, number]): AxisSpec {
  return {
    label,
    grid: true,
    tickFormat: ".0f",
    numericDomain: domain,
  };
}

function maxY(points: Array<{ y: number }>): number {
  return points.reduce((high, point) => (point.y > high ? point.y : high), 0);
}

function buildTimeseriesChartSpec(panel: TimeseriesPanel): TimeseriesChartSpec {
  return {
    kind: "timeseries",
    x: xAxisMinutes(panel.xAxisLabel),
    y: yAxisForLabel(panel.yAxisLabel),
    traces: panel.traces.map((trace) => ({
      key: trace.key,
      points: trace.points,
      stroke: TIMESERIES_TRACE_STROKE,
      strokeOpacity: TIMESERIES_TRACE_OPACITY,
    })),
    medianTrace: computeMedianTrace(panel.traces),
  };
}

function buildGenericLineChartSpec(panel: GenericLinePanel): GenericLineChartSpec {
  const overlay = panel.series.length > 1;
  const y = yAxisForLabel(panel.yAxisLabel);
  if (panel.yAxisLabel === "N(alive)") {
    const peak = panel.series.reduce((high, entry) => Math.max(high, maxY(entry.points)), 0);
    y.numericDomain = [0, Math.max(peak, 1)];
  }
  return {
    kind: "line",
    x: xAxisMinutes(panel.xAxisLabel),
    y,
    legend: overlay,
    series: panel.series.map((entry, index) => ({
      key: entry.label || entry.dataKey,
      points: entry.points,
      stroke: traceColor(index),
      strokeOpacity: GENERIC_LINE_OPACITY,
      strokeWidth: GENERIC_LINE_WIDTH,
    })),
  };
}

function buildBoxPlotChartSpec(panel: BoxPlotPanel): BoxPlotChartSpec {
  return {
    kind: "boxplot",
    x: {
      label: panel.xAxisLabel,
      categoryDomain: panel.groups.map((group) => group.label),
      tickRotate: boxPlotTickRotate(panel.groups.length),
    },
    y: yAxisForLabel(panel.yAxisLabel, panel.yScale),
    groups: panel.groups.map((group) => ({
      label: group.label,
      values: group.values,
      stats: group.stats,
    })),
  };
}

function buildHistogramChartSpec(panel: HistogramPanel): HistogramChartSpec {
  const histogram = bin<number, number>()
    .thresholds(HISTOGRAM_BIN_COUNT)(panel.values)
    .map((bucket) => ({
      x0: bucket.x0 ?? 0,
      x1: bucket.x1 ?? 0,
      count: bucket.length,
    }));

  return {
    kind: "histogram",
    x: xAxisMinutes(panel.xAxisLabel, panel.xDomain),
    y: yAxisForLabel(panel.yAxisLabel),
    bins: histogram,
  };
}

export function chartSpecForPanel(panel: ResultPanel): ChartSpec | null {
  if (panel.kind === "timeseries") {
    if (panel.traces.length === 0) return null;
    return buildTimeseriesChartSpec(panel);
  }
  if (panel.kind === "boxplot") {
    if (panel.groups.length === 0) return null;
    return buildBoxPlotChartSpec(panel);
  }
  if (panel.kind === "histogram") {
    if (panel.values.length === 0) return null;
    return buildHistogramChartSpec(panel);
  }
  if (panel.series.length === 0) return null;
  return buildGenericLineChartSpec(panel);
}

export function countChartSpecs(panels: ResultPanel[]): number {
  return panels.reduce((count, panel) => count + (chartSpecForPanel(panel) ? 1 : 0), 0);
}

export function boxPlotMarginBottom(spec: BoxPlotChartSpec): number {
  return boxPlotBottomMargin(spec.groups.length);
}

export { BOXPLOT_STROKE };
