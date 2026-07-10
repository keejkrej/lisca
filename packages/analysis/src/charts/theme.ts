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

export const GENERIC_LINE_OPACITY = 0.55;

export const CHART_MARGINS = {
  left: 128,
  bottom: 96,
  right: 36,
  top: 28,
} as const;

export const VICTORY_DOMAIN_PADDING = {
  left: 20,
  right: 20,
  top: 20,
  bottom: 20,
} as const;

export const PLOT_FONT = '"Lora", ui-serif, Georgia, serif';

export const PLOT_FONT_SIZE_PX = 20;

export const Y_AXIS_TICK_FORMAT = ".1e";

export function boxPlotBottomMargin(groupCount: number): number {
  return groupCount > 4 ? 176 : 128;
}

export function boxPlotTickRotate(groupCount: number): number {
  return groupCount > 4 ? -30 : 0;
}

export function traceColor(index: number): string {
  return TRACE_PALETTE[index % TRACE_PALETTE.length];
}
