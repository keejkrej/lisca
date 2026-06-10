import { Button } from "@lisca/ui/components";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div aria-hidden className="landing-hero-glow pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="landing-grid-bg pointer-events-none absolute inset-0 opacity-70"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-4 font-mono text-muted-foreground text-sm tracking-wide">
          micropatterned slides · live-cell imaging · single-cell arrays
        </p>

        <h1 className="max-w-4xl font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]">
          Live-cell imaging on{" "}
          <span className="text-muted-foreground">single-cell arrays.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
          LiSCA is analysis software for micropatterned ibidi µ-Slides and custom
          photopatterns — whether you start from prepatterned labware or pattern surfaces with
          the Micro Illumination System. Align images to the grid, annotate regions of interest,
          and read out assays from timelapse data on your array.
        </p>

        <div className="mt-10">
          <Button
            className="gap-2"
            render={
              <a href="#demos">
                Try with your images
                <ArrowRight aria-hidden />
              </a>
            }
            size="lg"
          />
        </div>
      </div>
    </section>
  );
}
