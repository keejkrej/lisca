/** Audience-facing copy for the landing page (cell biologists, pharmacologists). */

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
      "Outline cells and regions within each patterned site on live-cell frames. Assign phenotype labels for classification, assisted segmentation, or manual quality review across your timelapse.",
  },
  {
    id: "studio",
    title: "Studio",
    description:
      "Run a complete experiment in one workflow: choose an assay, enter sample and channel details, align to the grid, annotate regions of interest, and review quantitative readouts. Built for multi-site arrays rather than a single field of view.",
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
