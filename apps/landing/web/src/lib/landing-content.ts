/** Audience-facing copy for the landing page (cell biologists, pharmacologists). */

export const IBIDI_MICROPATTERNED_LABWARE_URL = "https://ibidi.com/83-micropatterned-labware";
export const IBIDI_MIS_URL =
  "https://ibidi.com/instruments/354-ibidi-micro-illumination-system.html";
export const SARTORIUS_SX5_URL =
  "https://www.sartorius.com/en/products/live-cell-imaging-analysis/live-cell-analysis-instruments/sx5-live-cell-analysis-instrument";

export const landingProducts = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "Match each microscopy field to the adhesive-site grid on your µ-Slide. Mark which micropatterns contain cells, leave empty sites out of the analysis, and keep the same site identity across wells and time points — even when the stage shifts slightly between acquisitions.",
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "Work on grid-aligned timelapse frames — the same sites you registered in Aligner. Outline cells within each patterned site, assign phenotype labels for segmentation or whole-site classification, and spot-check automated calls across your experiment.",
  },
  {
    id: "studio",
    title: "Studio",
    description:
      "Pick an assay template, map samples and channels, then review quantitative readouts across every site in your array. Studio runs the analysis pipeline and surfaces summary tables and plots — no repeat alignment or annotation steps.",
    assays: [
      {
        name: "Gene expression",
        detail:
          "Track fluorescence over time on patterned cultures — segmentation, intensity traces, area-under-curve summaries, and dose–response style plots for transfection and expression readouts.",
      },
      {
        name: "Immune killing",
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
  visual: "gene-expression" | "immune-killing" | "custom";
};

export const landingAssays: readonly LandingAssay[] = [
  {
    id: "gene-expression",
    name: "Gene expression",
    summary:
      "Quantify transfection or reporter expression across adhesive sites — fluorescence traces per site, area-under-curve summaries, and dose–response plots for comparing conditions.",
    outputs: [
      "Per-site fluorescence timelapse curves",
      "AUC and peak-intensity tables",
      "Dose–response and condition comparison plots",
    ],
    visual: "gene-expression",
  },
  {
    id: "immune-killing",
    name: "Immune killing",
    summary:
      "Score effector-mediated killing on patterned co-cultures — survival over time, death-time extraction, and kill-curve kinetics across wells and doses.",
    outputs: [
      "Site-level survival scores across timelapse",
      "Kill-curve and kinetic summary plots",
      "Condition tables for effector:target ratios",
    ],
    visual: "immune-killing",
  },
  {
    id: "custom",
    name: "Custom assay",
    summary:
      "Combine pipeline stages freely when a built-in template does not fit — much like the modular application suite on live-cell platforms such as the Sartorius Incucyte SX5, where you mix optical modules and analysis workflows for new readouts.",
    outputs: [
      "Pick segmentation, traces, survival scoring, or export steps à la carte",
      "Reuse the same grid alignment and ROI definitions across experiments",
      "Extend with new assay.json templates as your lab’s workflows grow",
    ],
    visual: "custom",
  },
];

export const workflowSteps = [
  {
    step: "01",
    title: "Raw timelapse",
    description: "Multi-site acquisition on micropatterned labware — brightfield and fluorescence channels per position.",
    visual: "raw" as const,
  },
  {
    step: "02",
    title: "Grid aligned",
    description: "Register the field to the adhesive-site grid and mark empty sites so they stay out of quantification.",
    visual: "aligned" as const,
  },
  {
    step: "03",
    title: "Sites annotated",
    description: "Outline cells or assign phenotype labels on occupied sites — assisted tools or manual QC.",
    visual: "annotated" as const,
  },
  {
    step: "04",
    title: "Assay readouts",
    description: "Run gene-expression or immune-killing analysis and review summary tables and plots in Studio.",
    visual: "readout" as const,
  },
] as const;
