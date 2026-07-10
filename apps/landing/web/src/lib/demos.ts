import { AlignDemo } from "@lisca/aligner-demo";
import { AnnotatorDemo } from "@lisca/annotator-demo";
import type { Component } from "solid-js";

import { ALIGNER_DEMO_PATH, ANNOTATOR_DEMO_PATH } from "./constants";

export type LandingDemo = {
  id: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  Demo: Component<{ embedded?: boolean }>;
};

export const landingDemos = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "ibidi micropattern brightfield field — align the grid on the full acquisition frame, mark occupied micropatterns, and switch square or hex layout. Annotator previews below crop the same files to a single ROI per cell.",
    href: ALIGNER_DEMO_PATH,
    linkLabel: "Try Aligner in your browser",
    Demo: AlignDemo,
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "ibidi fluorescence composite cropped to a single ROI — the cell-level frame you annotate after alignment. Switch sample files from the dropdown; use label chips to change colours. Segmentation draws outlines; Classification assigns one label to the whole cell.",
    href: ANNOTATOR_DEMO_PATH,
    linkLabel: "Try Annotator in your browser",
    Demo: AnnotatorDemo,
  },
] as const satisfies readonly LandingDemo[];

export const alignerDemo = landingDemos[0];
export const annotatorDemo = landingDemos[1];