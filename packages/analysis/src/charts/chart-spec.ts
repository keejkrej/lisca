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
  TIMESERIES_MEDIAN_STROKE,
  TIMESERIES_MEDIAN_WIDTH,
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

const HISTOGRAM_BIN_COUNT = 40;

function yAxis(label: string): AxisSpec {
  return {
    label,
    grid: true,
    tickFormat: Y_AXIS_TICK_FORMAT,
  };
}

function buildTimeseriesChartSpec(panel: TimeseriesPanel): TimeseriesChartSpec {
  return {
    kind: "timeseries",
    x: {
      label: panel.xAxisLabel,
      grid: true,
    },
    y: yAxis(panel.yAxisLabel),
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
  return {
    kind: "line",
    x: {
      label: panel.xAxisLabel,
      grid: true,
    },
    y: yAxis(panel.yAxisLabel),
    series: panel.series.map((entry, index) => ({
      key: entry.dataKey,
      points: entry.points,
      stroke: traceColor(index),
      strokeOpacity: GENERIC_LINE_OPACITY,
    })),
  };
}

function buildBoxPlotChartSpec(panel: BoxPlotPanel): BoxPlotChartSpec {
  return {
    kind: "boxplot",
    x: {
      label: panel.xAxisLabel,
      domain: panel.groups.map((group) => group.label),
      tickRotate: boxPlotTickRotate(panel.groups.length),
    },
    y: yAxis(panel.yAxisLabel),
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
    x: {
      label: panel.xAxisLabel,
      grid: true,
    },
    y: yAxis(panel.yAxisLabel),
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
