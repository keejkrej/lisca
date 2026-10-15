import type { ResultPlotSection } from "../../shared/sections";

export type BindingPlotSpec = {
  fileName: string;
  title: string;
  section: ResultPlotSection;
};

/** PNG artifacts written by the LNP binding (`lnp-binding`) plot stage, in display order. */
export const BINDING_PLOTS: readonly BindingPlotSpec[] = [
  { fileName: "binding_particles.png", title: "Particle count traces", section: "traces" },
  {
    fileName: "binding_particles_shared_y.png",
    title: "Particle count traces (shared y)",
    section: "traces",
  },
  {
    fileName: "binding_intensity_mean.png",
    title: "Mean particle intensity traces",
    section: "traces",
  },
  {
    fileName: "binding_intensity_mean_shared_y.png",
    title: "Mean particle intensity traces (shared y)",
    section: "traces",
  },
  {
    fileName: "binding_intensity_median.png",
    title: "Median particle intensity traces",
    section: "traces",
  },
  {
    fileName: "binding_intensity_median_shared_y.png",
    title: "Median particle intensity traces (shared y)",
    section: "traces",
  },
  {
    fileName: "binding_intensity_iqr.png",
    title: "Particle intensity IQR traces",
    section: "traces",
  },
  {
    fileName: "binding_intensity_iqr_shared_y.png",
    title: "Particle intensity IQR traces (shared y)",
    section: "traces",
  },
  {
    fileName: "binding_radius_mean.png",
    title: "Mean particle radius traces",
    section: "traces",
  },
  {
    fileName: "binding_radius_mean_shared_y.png",
    title: "Mean particle radius traces (shared y)",
    section: "traces",
  },
  {
    fileName: "binding_radius_median.png",
    title: "Median particle radius traces",
    section: "traces",
  },
  {
    fileName: "binding_radius_median_shared_y.png",
    title: "Median particle radius traces (shared y)",
    section: "traces",
  },
  {
    fileName: "binding_radius_iqr.png",
    title: "Particle radius IQR traces",
    section: "traces",
  },
  {
    fileName: "binding_radius_iqr_shared_y.png",
    title: "Particle radius IQR traces (shared y)",
    section: "traces",
  },
  {
    fileName: "binding_particles_summary.png",
    title: "Particle count summary",
    section: "traces-summary",
  },
  {
    fileName: "binding_particles_summary_shared_y.png",
    title: "Particle count summary (shared y)",
    section: "traces-summary",
  },
  {
    fileName: "binding_intensity_mean_summary.png",
    title: "Mean particle intensity summary",
    section: "traces-summary",
  },
  {
    fileName: "binding_intensity_mean_summary_shared_y.png",
    title: "Mean particle intensity summary (shared y)",
    section: "traces-summary",
  },
  {
    fileName: "binding_intensity_median_summary.png",
    title: "Median particle intensity summary",
    section: "traces-summary",
  },
  {
    fileName: "binding_intensity_median_summary_shared_y.png",
    title: "Median particle intensity summary (shared y)",
    section: "traces-summary",
  },
  {
    fileName: "binding_intensity_iqr_summary.png",
    title: "Particle intensity IQR summary",
    section: "traces-summary",
  },
  {
    fileName: "binding_intensity_iqr_summary_shared_y.png",
    title: "Particle intensity IQR summary (shared y)",
    section: "traces-summary",
  },
  {
    fileName: "binding_radius_mean_summary.png",
    title: "Mean particle radius summary",
    section: "traces-summary",
  },
  {
    fileName: "binding_radius_mean_summary_shared_y.png",
    title: "Mean particle radius summary (shared y)",
    section: "traces-summary",
  },
  {
    fileName: "binding_radius_median_summary.png",
    title: "Median particle radius summary",
    section: "traces-summary",
  },
  {
    fileName: "binding_radius_median_summary_shared_y.png",
    title: "Median particle radius summary (shared y)",
    section: "traces-summary",
  },
  {
    fileName: "binding_radius_iqr_summary.png",
    title: "Particle radius IQR summary",
    section: "traces-summary",
  },
  {
    fileName: "binding_radius_iqr_summary_shared_y.png",
    title: "Particle radius IQR summary (shared y)",
    section: "traces-summary",
  },
] as const;
