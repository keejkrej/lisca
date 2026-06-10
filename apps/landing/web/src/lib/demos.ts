import { AlignDemo } from "@lisca/aligner-demo";
import { AnnotatorDemo } from "@lisca/annotator-demo";
import { Grid3x3, Paintbrush } from "lucide-react";
import type { ComponentType } from "react";

import { ALIGNER_DEMO_PATH, ANNOTATOR_DEMO_PATH } from "./constants";

export type LandingDemo = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  Demo: ComponentType<{ embedded?: boolean }>;
};

export const landingDemos = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "Register your microscopy image to the micropattern grid. Mark which adhesive sites hold cells and which are empty, correct for slight rotation or stage drift, and export positions for counting and assay readouts.",
    href: ALIGNER_DEMO_PATH,
    icon: Grid3x3,
    Demo: AlignDemo,
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "Outline cells and regions within each pattern site on live-cell frames. Assign labels for phenotyping, segmentation training, or manual quality control across your timelapse.",
    href: ANNOTATOR_DEMO_PATH,
    icon: Paintbrush,
    Demo: AnnotatorDemo,
  },
] as const satisfies readonly LandingDemo[];
