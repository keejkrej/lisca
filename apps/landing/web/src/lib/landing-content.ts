/** Audience-facing copy for the landing page (cell biologists, pharmacologists). */

export const IBIDI_MICROPATTERNED_LABWARE_URL = "https://ibidi.com/83-micropatterned-labware";
export const IBIDI_MIS_URL =
  "https://ibidi.com/instruments/354-ibidi-micro-illumination-system.html";

export const landingProducts = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "Register each microscopy field to the micropattern grid, mark occupied micropatterns, and export aligned ROI images. A single-purpose tool for patterned arrays — no built-in analysis. Use it on its own and feed exports into your in-house pipeline.",
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "Outline cells and assign phenotype labels on grid-aligned, single-cell ROI frames. A single-purpose annotation tool for micropattern experiments — no built-in quantification. Export masks and classifications to your own analysis stack.",
  },
  {
    id: "studio",
    title: "Studio",
    description:
      "The complete end-to-end workflow when your experiment matches a LiSCA assay template: wizard setup, alignment, annotation, and built-in analysis with summary tables and plots in one app. Recommended for straightforward studies where a template fits your design.",
    assays: [
      {
        name: "Transfection",
        detail:
          "Track fluorescence over time on patterned cultures — segmentation, intensity traces, area-under-curve summaries, and dose–response style plots for transfection and expression readouts.",
      },
      {
        name: "Killing",
        detail:
          "Score cell survival across timelapse positions and summarise killing kinetics from patterned effector–target co-cultures.",
      },
    ],
  },
] as const;

export type LandingAssay = {
  id: string;
  name: string;
  summary: string;
  outputs: string[];
  visual: "transfection" | "killing" | "custom";
};

export const landingAssays: readonly LandingAssay[] = [
  {
    id: "transfection",
    name: "Transfection",
    summary:
      "Quantify transfection or reporter expression across arrayed single cells — fluorescence traces per cell, area-under-curve summaries, and dose–response plots for comparing conditions.",
    outputs: [
      "Per-cell fluorescence timelapse curves",
      "AUC and peak-intensity tables",
      "Dose–response and condition comparison plots",
    ],
    visual: "transfection",
  },
  {
    id: "killing",
    name: "Killing",
    summary:
      "Score effector-mediated killing on patterned co-cultures — survival over time, death-time extraction, and kill-curve kinetics across wells and doses.",
    outputs: [
      "Single-cell-level survival scores across timelapse",
      "Kill-curve and kinetic summary plots",
      "Condition tables for effector:target ratios",
    ],
    visual: "killing",
  },
];

export const workflowSteps = [
  {
    step: "01",
    title: "Raw timelapse",
    description:
      "Multi-position acquisition on micropatterned labware — brightfield and fluorescence channels per field.",
    visual: "raw" as const,
  },
  {
    step: "02",
    title: "Grid aligned",
    description:
      "Register the field to the micropattern grid and mark unoccupied micropatterns so they stay out of quantification.",
    visual: "aligned" as const,
  },
  {
    step: "03",
    title: "Cells annotated",
    description:
      "Outline cells or assign phenotype labels on occupied micropatterns — assisted tools or manual QC.",
    visual: "annotated" as const,
  },
  {
    step: "04",
    title: "Assay readouts",
    description:
      "Run transfection or killing analysis and review summary tables and plots in Studio.",
    visual: "readout" as const,
  },
] as const;
