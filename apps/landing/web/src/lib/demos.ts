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

export const landingDemos = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "ibidi micropattern example (brightfield) with a starter grid fit — pan and zoom the grid, switch square or hex layout, and explore alignment on a sample frame.",
    href: ALIGNER_DEMO_PATH,
    linkLabel: "Try Aligner in your browser",
    Demo: AlignDemo,
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "ibidi fluorescence composite example — use the label chips below the canvas to switch colours. Segmentation draws outlines; Classification assigns one label to the whole site.",
    href: ANNOTATOR_DEMO_PATH,
    linkLabel: "Try Annotator in your browser",
    Demo: AnnotatorDemo,
  },
] as const satisfies readonly LandingDemo[];

export const alignerDemo = landingDemos[0];
export const annotatorDemo = landingDemos[1];
