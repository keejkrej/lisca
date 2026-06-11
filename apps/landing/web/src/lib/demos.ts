import { AlignDemo } from "@lisca/aligner-demo";
import { AnnotatorDemo } from "@lisca/annotator-demo";
import type { ComponentType } from "react";

import { ALIGNER_DEMO_PATH, ANNOTATOR_DEMO_PATH } from "./constants";

export type LandingDemo = {
  id: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  Demo: ComponentType<{ embedded?: boolean }>;
};

/** Demo components for /aligner-demo and /annotator-demo — not embedded on the landing page. */
export const landingDemos = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "Load a snapshot or timelapse frame from patterned cells and register it to the micropattern grid. Mark occupied and empty adhesive sites, adjust for slight rotation or drift, and export site positions for counting and assay readouts.",
    href: ALIGNER_DEMO_PATH,
    linkLabel: "Try Aligner in your browser",
    Demo: AlignDemo,
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "Open a live-cell frame and outline cells within each patterned site. Assign labels for phenotyping, assisted cell outlining, or spot-checking automated calls across your timelapse.",
    href: ANNOTATOR_DEMO_PATH,
    linkLabel: "Try Annotator in your browser",
    Demo: AnnotatorDemo,
  },
] as const satisfies readonly LandingDemo[];

export const alignerDemo = landingDemos[0];
export const annotatorDemo = landingDemos[1];
