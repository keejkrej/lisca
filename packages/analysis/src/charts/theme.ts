export const TRACE_PALETTE = [
  "#60a5fa",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#38bdf8",
] as const;

export const TIMESERIES_TRACE_STROKE = "#9ca3af";
export const TIMESERIES_TRACE_OPACITY = 0.3;
export const TIMESERIES_MEDIAN_STROKE = "#ef4444";
export const TIMESERIES_MEDIAN_WIDTH = 3;

export const BOXPLOT_FILL = "#60a5fa33";
export const BOXPLOT_STROKE = "#60a5fa";

export const HISTOGRAM_FILL = "#60a5fa";
export const HISTOGRAM_FILL_OPACITY = 0.7;

export const GENERIC_LINE_OPACITY = 0.9;
export const GENERIC_LINE_WIDTH = 2;

export const CHART_MARGINS = {
  left: 72,
  bottom: 64,
  right: 28,
  top: 24,
} as const;

export const PLOT_FONT = '"Geist Variable", ui-sans-serif, system-ui, sans-serif';

export const PLOT_FONT_SIZE_PX = 14;

export const Y_AXIS_TICK_FORMAT = ".2s";

export function boxPlotBottomMargin(groupCount: number): number {
  return groupCount > 4 ? 120 : 80;
}

export function boxPlotTickRotate(groupCount: number): number {
  return groupCount > 4 ? -30 : 0;
}

export function traceColor(index: number): string {
  return TRACE_PALETTE[index % TRACE_PALETTE.length];
}
