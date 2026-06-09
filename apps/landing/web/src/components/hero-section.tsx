import { Button } from "@lisca/ui/components";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Grid3x3, Paintbrush } from "lucide-react";

import { ALIGNER_DEMO_PATH, ANNOTATOR_DEMO_PATH } from "../lib/constants";

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
          open-source · browser demos · no install
        </p>

        <h1 className="max-w-4xl font-semibold text-4xl tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]">
          Live-cell imaging on <span className="text-muted-foreground">single cell arrays.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
          Align grids, annotate ROIs, and run assays on microscopy images — try the interactive
          demos right in your browser, or explore the full stack on GitHub.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            className="gap-2"
            render={
              <Link to={ALIGNER_DEMO_PATH}>
                <Grid3x3 aria-hidden />
                Try Aligner demo
              </Link>
            }
            size="lg"
          />
          <Button
            className="gap-2"
            render={
              <Link to={ANNOTATOR_DEMO_PATH}>
                <Paintbrush aria-hidden />
                Try Annotator demo
              </Link>
            }
            size="lg"
            variant="outline"
          />
          <Button
            className="gap-2"
            render={
              <a href="#demos">
                Preview below
                <ArrowRight aria-hidden />
              </a>
            }
            size="lg"
            variant="ghost"
          />
        </div>
      </div>
    </section>
  );
}
