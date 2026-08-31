export type TransfectionPlotSpec = {
  fileName: string;
  title: string;
  section: "timeseries" | "parameters";
};

/** PNG artifacts written by the Rust transfection plot stages, in display order. */
export const TRANSFECTION_PLOTS: readonly TransfectionPlotSpec[] = [
  { fileName: "traces.png", title: "Intensity traces", section: "timeseries" },
  { fileName: "traces_shared_y.png", title: "Intensity traces (shared y)", section: "timeseries" },
  { fileName: "traces_summary.png", title: "Intensity summary", section: "timeseries" },
  {
    fileName: "traces_summary_shared_y.png",
    title: "Intensity summary (shared y)",
    section: "timeseries",
  },
  { fileName: "area.png", title: "Mask area", section: "timeseries" },
  { fileName: "area_shared_y.png", title: "Mask area (shared y)", section: "timeseries" },
  { fileName: "area_summary.png", title: "Mask area summary", section: "timeseries" },
  {
    fileName: "area_summary_shared_y.png",
    title: "Mask area summary (shared y)",
    section: "timeseries",
  },
  { fileName: "traces_fit.png", title: "Fitted traces", section: "timeseries" },
  { fileName: "traces_fit_shared_y.png", title: "Fitted traces (shared y)", section: "timeseries" },
  { fileName: "mrna_lifetime.png", title: "mRNA lifetime", section: "parameters" },
  { fileName: "auc.png", title: "AUC", section: "parameters" },
  { fileName: "auc_log.png", title: "AUC (log)", section: "parameters" },
  { fileName: "expression_rate.png", title: "Expression rate", section: "parameters" },
  { fileName: "expression_rate_log.png", title: "Expression rate (log)", section: "parameters" },
  { fileName: "onset_time.png", title: "Onset time", section: "parameters" },
  {
    fileName: "expression_rate_vs_onset_time.png",
    title: "Expression rate vs onset time",
    section: "parameters",
  },
  { fileName: "baseline_intensity.png", title: "Baseline intensity", section: "parameters" },
  { fileName: "protein_lifetime.png", title: "Protein lifetime", section: "parameters" },
] as const;
