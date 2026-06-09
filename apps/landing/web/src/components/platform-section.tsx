import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@lisca/ui/components";
import { FlaskConical, Grid3x3, Layers, Paintbrush } from "lucide-react";

const products = [
  {
    icon: Grid3x3,
    title: "Aligner",
    description: "Grid-based cell placement for high-throughput array imaging workflows.",
  },
  {
    icon: Paintbrush,
    title: "Annotator",
    description: "ROI masks and classification labels for training and QC on live-cell data.",
  },
  {
    icon: FlaskConical,
    title: "Studio",
    description: "End-to-end assay pipeline — crop, align, annotate, analyze, and view results.",
  },
  {
    icon: Layers,
    title: "Shared core",
    description: "Rust image I/O and analysis, Effect contracts, and cross-platform UI shells.",
  },
] as const;

export function PlatformSection() {
  return (
    <section className="scroll-mt-20 border-t border-border/60 py-20 sm:py-28" id="platform">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            One platform, three apps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Lisca ships as web, desktop, and mobile surfaces over a shared Rust core and typed
            contracts — built for reproducible live-cell experiments on single-cell arrays.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {products.map((product) => (
            <Card key={product.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <product.icon aria-hidden className="size-5 opacity-80" />
                  {product.title}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {product.description}
                </CardDescription>
              </CardHeader>
              <CardPanel className="pt-0">
                <div
                  aria-hidden
                  className="h-1 w-12 rounded-full bg-linear-to-r from-foreground/30 to-transparent"
                />
              </CardPanel>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
