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
  heroCta: string;
};

export const landingDemos = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "Place and exclude cells on a regular grid. Open a microscopy image, tune contrast, and export bounding boxes — all client-side.",
    href: ALIGNER_DEMO_PATH,
    icon: Grid3x3,
    Demo: AlignDemo,
    heroCta: "Try Aligner demo",
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "Paint ROI masks and assign labels on live-cell frames. Brush tools, label classes, and annotation export without a backend.",
    href: ANNOTATOR_DEMO_PATH,
    icon: Paintbrush,
    Demo: AnnotatorDemo,
    heroCta: "Try Annotator demo",
  },
] as const satisfies readonly LandingDemo[];
