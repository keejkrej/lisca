import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@lisca/ui/components";
import { FlaskConical, Grid3x3, LayoutGrid, Paintbrush } from "lucide-react";

const products = [
  {
    icon: Grid3x3,
    title: "Aligner",
    description:
      "Map each imaging field to the adhesive-site grid on your slide. Score occupancy, exclude empty patterns, and keep site identities consistent across wells and time points.",
  },
  {
    icon: Paintbrush,
    title: "Annotator",
    description:
      "Draw masks and labels on cells within patterned regions — for segmentation models, phenotype classes, or spot-checking automated calls on live-cell data.",
  },
  {
    icon: FlaskConical,
    title: "Studio",
    description:
      "Carry a full experiment from well selection through alignment, annotation, and assay analysis — built around multi-site arrays rather than one field of view.",
  },
  {
    icon: LayoutGrid,
    title: "Pattern-first by design",
    description:
      "Every step assumes the regular geometry you get from micropatterned µ-Slides and UV photopatterning — not unconstrained monolayers on plain plastic.",
  },
] as const;

export function PlatformSection() {
  return (
    <section className="scroll-mt-20 border-t border-border/60 py-20 sm:py-28" id="platform">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            From patterned surface to readout
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Live-cell imaging on single-cell arrays starts with patterned adhesion sites — on
            prepatterned ibidi labware or surfaces you define with a photomask and the Micro
            Illumination System. Seed cells, image over time, then quantify in LiSCA from the
            first frame to the final assay table.
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
