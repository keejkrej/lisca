export type KillingPlotSpec = {
  fileName: string;
  title: string;
  section: "traces" | "parameters";
};

/** PNG artifacts written by the death-reporter plot stage, in display order. */
export const KILLING_PLOTS: readonly KillingPlotSpec[] = [
  { fileName: "traces.png", title: "Fluorescence traces", section: "traces" },
  {
    fileName: "traces_shared_y.png",
    title: "Fluorescence traces (shared y)",
    section: "traces",
  },
  { fileName: "traces_summary.png", title: "Mean fluorescence", section: "parameters" },
  {
    fileName: "traces_summary_shared_y.png",
    title: "Mean fluorescence (shared y)",
    section: "parameters",
  },
] as const;

/** PNG artifacts for fluorescent engagement. Names stay off the death-reporter `traces.png`. */
export const ENGAGEMENT_PLOTS: readonly KillingPlotSpec[] = [
  { fileName: "engagement_traces.png", title: "Engager traces", section: "traces" },
  {
    fileName: "engagement_traces_shared_y.png",
    title: "Engager traces (shared y)",
    section: "traces",
  },
  { fileName: "engagement_traces_summary.png", title: "Mean engagers", section: "parameters" },
  {
    fileName: "engagement_traces_summary_shared_y.png",
    title: "Mean engagers (shared y)",
    section: "parameters",
  },
] as const;
