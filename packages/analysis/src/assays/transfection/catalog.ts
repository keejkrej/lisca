export type TransfectionPlotScope = "workspace" | "sample";

export type TransfectionPlotSpec = {
  fileName: string;
  title: string;
  section: "timeseries" | "parameters";
  /** Workspace boxplots live at `results/`; sample packs at `results/<sample>/`. */
  scope: TransfectionPlotScope;
};

/** PNG artifacts written by the sidecar plot stages, in display order. */
export const TRANSFECTION_PLOTS: readonly TransfectionPlotSpec[] = [
  { fileName: "traces.png", title: "Intensity traces", section: "timeseries", scope: "sample" },
  {
    fileName: "traces_shared_y.png",
    title: "Intensity traces (shared y)",
    section: "timeseries",
    scope: "sample",
  },
  {
    fileName: "traces_summary.png",
    title: "Intensity summary",
    section: "timeseries",
    scope: "sample",
  },
  {
    fileName: "traces_summary_shared_y.png",
    title: "Intensity summary (shared y)",
    section: "timeseries",
    scope: "sample",
  },
  { fileName: "area.png", title: "Mask area", section: "timeseries", scope: "sample" },
  {
    fileName: "area_shared_y.png",
    title: "Mask area (shared y)",
    section: "timeseries",
    scope: "sample",
  },
  { fileName: "traces_fit.png", title: "Fitted traces", section: "timeseries", scope: "sample" },
  {
    fileName: "traces_fit_shared_y.png",
    title: "Fitted traces (shared y)",
    section: "timeseries",
    scope: "sample",
  },
  {
    fileName: "mrna_lifetime.png",
    title: "mRNA lifetime",
    section: "parameters",
    scope: "workspace",
  },
  { fileName: "auc.png", title: "AUC", section: "parameters", scope: "workspace" },
  {
    fileName: "expression_rate.png",
    title: "Expression rate",
    section: "parameters",
    scope: "workspace",
  },
  { fileName: "onset_time.png", title: "Onset time", section: "parameters", scope: "workspace" },
  {
    fileName: "baseline_intensity.png",
    title: "Baseline intensity",
    section: "parameters",
    scope: "workspace",
  },
  {
    fileName: "protein_lifetime.png",
    title: "Protein lifetime",
    section: "parameters",
    scope: "workspace",
  },
  {
    fileName: "expression_rate_vs_onset_time.png",
    title: "Expression rate vs onset time",
    section: "parameters",
    scope: "sample",
  },
  {
    fileName: "expression_rate_vs_mrna_lifetime.png",
    title: "Expression rate vs mRNA lifetime",
    section: "parameters",
    scope: "sample",
  },
] as const;
