/** Analysis `PosN/chC.csv`. Optional `channel` when a Pos has multiple signal CSVs. */
export const TRANSFECTION_TRACE_CSV_COLUMNS = [
  "roi",
  "t",
  "area",
  "background",
  "sum",
  "corrected",
] as const;

/** Analysis `PosN/auc.csv`. Optional `channel` when a Pos has multiple signal CSVs. */
export const TRANSFECTION_AUC_CSV_COLUMNS = ["roi", "auc"] as const;

/**
 * Analysis `PosN/fit.csv`. Optional `channel` when a Pos has multiple signal CSVs.
 * Internal solver fields (`expression_amplitude`, `*_degradation_rate`) are not written.
 */
export const TRANSFECTION_FIT_CSV_COLUMNS = [
  "roi",
  "baseline_intensity",
  "onset_time",
  "expression_rate",
  "mrna_lifetime",
  "protein_lifetime",
  "success",
] as const;

/** Identity column prefixed on per-sample XLSX packs. Folder is the sample; no `slide_channel` / `sample` columns. */
export const TRANSFECTION_XLSX_POS_COLUMN = "pos";

/** `results/<sample>/traces.xlsx`. Optional `channel` when a sample has multiple signal channels. */
export const TRANSFECTION_TRACE_XLSX_COLUMNS = [
  "pos",
  "roi",
  "t",
  "area",
  "background",
  "sum",
  "corrected",
] as const;

/** `results/<sample>/auc.xlsx`. Optional `channel` when a sample has multiple signal channels. */
export const TRANSFECTION_AUC_XLSX_COLUMNS = ["pos", "roi", "auc"] as const;

/** `results/<sample>/fit.xlsx`. Optional `channel` when a sample has multiple signal channels. */
export const TRANSFECTION_FIT_XLSX_COLUMNS = [
  "pos",
  "roi",
  "baseline_intensity",
  "onset_time",
  "expression_rate",
  "mrna_lifetime",
  "protein_lifetime",
  "success",
] as const;

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
    title: "mRNA lifetime τ_mRNA",
    section: "parameters",
    scope: "workspace",
  },
  { fileName: "auc.png", title: "AUC", section: "parameters", scope: "workspace" },
  {
    fileName: "expression_rate.png",
    title: "Expression rate m0 k_TL",
    section: "parameters",
    scope: "workspace",
  },
  { fileName: "onset_time.png", title: "Onset time t0", section: "parameters", scope: "workspace" },
  {
    fileName: "baseline_intensity.png",
    title: "Baseline intensity",
    section: "parameters",
    scope: "workspace",
  },
  {
    fileName: "protein_lifetime.png",
    title: "Protein lifetime τ_EGFP",
    section: "parameters",
    scope: "workspace",
  },
  {
    fileName: "expression_rate_vs_onset_time.png",
    title: "Expression rate m0 k_TL vs onset time t0",
    section: "parameters",
    scope: "sample",
  },
  {
    fileName: "expression_rate_vs_mrna_lifetime.png",
    title: "Expression rate m0 k_TL vs mRNA lifetime τ_mRNA",
    section: "parameters",
    scope: "sample",
  },
] as const;
