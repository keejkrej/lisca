import { AlignDemo } from "@lisca/aligner-demo";
import { AnnotatorDemo } from "@lisca/annotator-demo";
import type { ComponentType } from "react";

import { ALIGNER_DEMO_PATH, ANNOTATOR_DEMO_PATH } from "./constants";

export type LandingDemo = {
  id: string;
  title: string;
  description: string;
  href: string;
  Demo: ComponentType<{ embedded?: boolean }>;
};

/** Demo components for /aligner-demo and /annotator-demo — not embedded on the landing page. */
export const landingDemos = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "Register your microscopy image to the micropattern grid. Mark which adhesive sites hold cells and which are empty, correct for slight rotation or stage drift, and export positions for counting and assay readouts.",
    href: ALIGNER_DEMO_PATH,
    Demo: AlignDemo,
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "Outline cells and regions within each pattern site on live-cell frames. Assign labels for phenotyping, segmentation training, or manual quality control across your timelapse.",
    href: ANNOTATOR_DEMO_PATH,
    Demo: AnnotatorDemo,
  },
] as const satisfies readonly LandingDemo[];

export const alignerDemo = landingDemos[0];
export const annotatorDemo = landingDemos[1];
