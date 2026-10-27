import type { ResultPlotSection } from "../../shared/sections";

export type BindingPlotSpec = {
  fileName: string;
  title: string;
  section: ResultPlotSection;
};

/** PNG artifacts written by the LNP-binding plot stage, in display order. */
export const BINDING_PLOTS: readonly BindingPlotSpec[] = [
  { fileName: "binding_traces.png", title: "Spot-count traces", section: "traces" },
  {
    fileName: "binding_traces_shared_y.png",
    title: "Spot-count traces (shared y)",
    section: "traces",
  },
  {
    fileName: "binding_traces_summary.png",
    title: "Mean spot count",
    section: "traces-summary",
  },
  {
    fileName: "binding_traces_summary_shared_y.png",
    title: "Mean spot count (shared y)",
    section: "traces-summary",
  },
] as const;
