/** Summary plots shown on the Survival tab for the killing assay. */
export const KILLING_SUMMARY_PLOTS = [
  { id: "kill_curve", label: "N(alive)" },
  { id: "death_times", label: "T_death" },
] as const;

export type KillingSummaryPlotId = (typeof KILLING_SUMMARY_PLOTS)[number]["id"];
