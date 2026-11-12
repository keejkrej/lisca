/** Analysis gallery views, in dock and page order. */
export const RESULT_PLOT_SECTIONS = [
  "traces",
  "traces-summary",
  "viability",
  "area",
  "traces-fit",
  "auc",
  "parameters",
  "parameters-comparison",
] as const;

export type ResultPlotSection = (typeof RESULT_PLOT_SECTIONS)[number];
