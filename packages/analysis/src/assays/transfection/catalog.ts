/** Summary parameter plots shown on the Parameters tab, in display order. */
export const DISPLAYED_PARAMETER_PLOTS = [
  { id: "mrna_lifetime", label: "mRNA lifetime" },
  { id: "auc", label: "AUC" },
  { id: "expression_rate", label: "expression rate" },
  { id: "translation_onset", label: "translation onset" },
] as const;

/** Matches transfection.commands.plot_fit.PLOTTED_PARAMETERS */
export const PLOTTED_FIT_PARAMETERS = [
  ["intensity_offset", "intensity offset"],
  ["protein_lifetime", "protein lifetime"],
  ["mrna_lifetime", "mRNA lifetime"],
  ["translation_onset", "translation onset"],
  ["expression_rate", "expression rate"],
] as const;

export type DisplayedParameterPlotId = (typeof DISPLAYED_PARAMETER_PLOTS)[number]["id"];
