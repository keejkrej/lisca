/** Summary parameter plots shown on the Parameters tab, in display order. */
export const DISPLAYED_PARAMETER_PLOTS = [
  { id: "mrna_lifetime", label: "mRNA lifetime" },
  { id: "auc", label: "AUC" },
  { id: "transfection_efficiency", label: "transfection efficiency" },
  { id: "translation_onset", label: "translation onset" },
] as const;

/** PNG filenames under workspace/results/, matching transfection plot output. */
export const TIMESERIES_RESULT_PLOT_FILES = {
  corrected: "traces.png",
  correctedSharedY: "traces_shared_y.png",
  area: "area.png",
  areaSharedY: "area_shared_y.png",
} as const;

/** Matches transfection.commands.plot_fit.PLOTTED_PARAMETERS */
export const PLOTTED_FIT_PARAMETERS = [
  ["intensity_offset", "intensity offset"],
  ["protein_lifetime", "protein lifetime"],
  ["mrna_lifetime", "mRNA lifetime"],
  ["translation_onset", "translation onset"],
  ["transfection_efficiency", "transfection efficiency"],
] as const;

export type DisplayedParameterPlotId = (typeof DISPLAYED_PARAMETER_PLOTS)[number]["id"];
