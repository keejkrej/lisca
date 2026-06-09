import { Button } from "@lisca/ui/components";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@lisca/ui/components";
import { ExternalLink, Grid3x3, Paintbrush } from "lucide-react";

import { ALIGNER_DEMO_PATH, ANNOTATOR_DEMO_PATH } from "../lib/constants";

const demos = [
  {
    id: "aligner",
    title: "Aligner",
    description:
      "Place and exclude cells on a regular grid. Open a microscopy image, tune contrast, and export bounding boxes — all client-side.",
    href: ALIGNER_DEMO_PATH,
    icon: Grid3x3,
    features: ["Grid alignment", "Cell include/exclude", "CSV & JSON export"],
  },
  {
    id: "annotator",
    title: "Annotator",
    description:
      "Paint ROI masks and assign labels on live-cell frames. Brush tools, label classes, and annotation export without a backend.",
    href: ANNOTATOR_DEMO_PATH,
    icon: Paintbrush,
    features: ["Mask painting", "Label classes", "PNG & JSON export"],
  },
] as const;

export function DemoShowcase() {
  return (
    <section className="scroll-mt-20 border-t border-border/60 py-20 sm:py-28" id="demos">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            Try it in your browser
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Both demos run entirely in the browser — open a local PNG, JPEG, or TIFF and interact
            immediately. No account, no server, no install.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {demos.map((demo) => (
            <Card className="overflow-hidden" key={demo.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <demo.icon aria-hidden className="size-5 opacity-80" />
                      {demo.title}
                    </CardTitle>
                    <CardDescription className="mt-2 text-base leading-relaxed">
                      {demo.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardPanel className="px-4 pt-0 sm:px-6">
                <div className="landing-demo-frame">
                  <iframe
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
                    src={demo.href}
                    title={`${demo.title} interactive demo`}
                    className="h-[min(52vh,420px)]"
                  />
                </div>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {demo.features.map((feature) => (
                    <li
                      className="rounded-full border border-border bg-muted/30 px-3 py-1 font-mono text-muted-foreground text-xs"
                      key={feature}
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardPanel>

              <CardFooter className="gap-3">
                <Button
                  className="gap-2"
                  render={
                    <a href={demo.href}>
                      Open full demo
                      <ExternalLink aria-hidden className="size-4" />
                    </a>
                  }
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
