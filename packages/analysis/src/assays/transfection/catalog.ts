/**
 * Summary parameter plots shown on the Parameters tab, in display order.
 * Ids match fit.csv columns and Müller et al. 2024 terms (basic model, no
 * maturation): onset_time t0, expression_rate m0·kTL, mrna_lifetime.
 */
export const DISPLAYED_PARAMETER_PLOTS = [
  { id: "mrna_lifetime", label: "mRNA lifetime" },
  { id: "auc", label: "AUC" },
  { id: "expression_rate", label: "expression rate" },
  { id: "onset_time", label: "onset time" },
] as const;

/** Matches transfection plot_fit PLOTTED_PARAMETERS (Python + Rust). */
export const PLOTTED_FIT_PARAMETERS = [
  ["baseline_intensity", "baseline intensity"],
  ["protein_lifetime", "protein lifetime"],
  ["mrna_lifetime", "mRNA lifetime"],
  ["onset_time", "onset time"],
  ["expression_rate", "expression rate"],
] as const;

export type DisplayedParameterPlotId = (typeof DISPLAYED_PARAMETER_PLOTS)[number]["id"];
