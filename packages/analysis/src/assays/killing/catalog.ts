export type KillingPlotSpec = {
  fileName: string;
  title: string;
  section: "traces" | "parameters";
};

/** PNG artifacts written by the Rust killing plot stages, in display order. */
export const KILLING_PLOTS: readonly KillingPlotSpec[] = [
  { fileName: "traces.png", title: "P(dead) traces", section: "traces" },
  { fileName: "traces_shared_y.png", title: "P(dead) traces (shared y)", section: "traces" },
  { fileName: "traces_summary.png", title: "P(dead) summary", section: "traces" },
  {
    fileName: "traces_summary_shared_y.png",
    title: "P(dead) summary (shared y)",
    section: "traces",
  },
  { fileName: "kill_curve.png", title: "N(alive)", section: "parameters" },
  { fileName: "death_times.png", title: "T_death", section: "parameters" },
] as const;
