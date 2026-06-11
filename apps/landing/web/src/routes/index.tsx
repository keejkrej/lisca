import { Button } from "@lisca/ui/components";
import { ShellThemeToggle } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Github } from "lucide-react";

import { DemoEmbed } from "../components/demo-embed";
import { GITHUB_REPO, GITHUB_URL } from "../lib/constants";
import { landingDemos } from "../lib/demos";
import { landingProducts } from "../lib/landing-content";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const NAV = [
  { href: "#demos", label: "Demos" },
  { href: "#platform", label: "Platform" },
] as const;

function LandingPage() {
  const aligner = landingProducts.find((product) => product.id === "aligner");
  const annotator = landingProducts.find((product) => product.id === "annotator");
  const studio = landingProducts.find((product) => product.id === "studio");

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-4 py-2 font-mono text-sm outline-none focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to content
      </a>
      <Header />

      <main id="main">
        <Hero />

        <section id="demos" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 sm:py-28">
          <SectionIntro
            eyebrow="Try it on your data"
            title="The workflow, running in your browser"
            lead="Load a fixed snapshot or a timelapse frame from patterned cultures. These previews use the same alignment and annotation steps you would run after an imaging session — nothing installs, nothing uploads."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {landingDemos.map((demo, index) => (
              <DemoEmbed key={demo.id} demo={demo} index={index} />
            ))}
          </div>
        </section>

        <section id="platform" className="relative scroll-mt-24 border-t border-border">
          <div className="texture-grain relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <SectionIntro
              eyebrow="From surface to readout"
              title="From patterned surface to assay readout"
              lead="Live-cell work on single-cell arrays begins with defined adhesion sites — on prepatterned ibidi labware or surfaces you pattern with a photomask and the Micro Illumination System. After seeding and timelapse imaging, LiSCA carries you from the first frame to summary tables and plots."
            />

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {aligner ? <ProductCard step="01" title={aligner.title} body={aligner.description} /> : null}
              {annotator ? (
                <ProductCard step="02" title={annotator.title} body={annotator.description} />
              ) : null}
            </div>

            {studio ? (
              <article className="mt-5 overflow-hidden rounded-2xl border border-border bg-card/60">
                <div className="flex flex-col gap-3 border-b border-border p-6 sm:p-8">
                  <p className="font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base">
                    Step 03
                  </p>
                  <h3 className="font-display text-2xl font-semibold">{studio.title}</h3>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {studio.description}
                  </p>
                </div>
                <div className="grid gap-px bg-border sm:grid-cols-2">
                  {studio.assays.map((assay) => (
                    <div key={assay.name} className="bg-card/60 p-6 sm:p-8">
                      <h4 className="font-display text-lg font-semibold">{assay.name}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {assay.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            <article className="mt-5 rounded-2xl border border-dashed border-border p-6 sm:p-8">
              <h3 className="font-display text-xl font-semibold">Built for micropattern geometry</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Every step assumes the regular layout of adhesive sites on µ-Slides and photopatterned
                surfaces — not unconstrained monolayers on plain plastic. That keeps site identity,
                occupancy, and timelapse quantification consistent across an entire array experiment.
              </p>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            render={
              <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank" aria-label="Project repository on GitHub" />
            }
            variant="ghost"
            size="icon-sm"
          >
            <Github aria-hidden />
          </Button>
          <ShellThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-36">
        <p className="animate-rise font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
          micropatterned slides · live-cell imaging · single-cell arrays
        </p>
        <h1 className="animate-rise mt-6 max-w-4xl text-balance font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl" style={{ animationDelay: "0.08s" }}>
          Live-cell imaging on{" "}
          <span className="text-glow">single-cell arrays.</span>
        </h1>
        <p className="animate-rise mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg" style={{ animationDelay: "0.16s" }}>
          LiSCA helps cell biologists and pharmacologists analyse micropatterned ibidi µ-Slides and
          custom photopatterns — whether you start from prepatterned labware or define adhesion sites
          with the Micro Illumination System. Align timelapse images to the grid, mark regions of
          interest on individual cells, and turn patterned-array experiments into quantitative assay
          readouts.
        </p>
        <div className="animate-rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.24s" }}>
          <Button render={<a href="#demos" />} size="lg">
            Explore the tools
            <ArrowRight aria-hidden />
          </Button>
          <Button render={<a href="#platform" />} variant="outline" size="lg">
            How it works
          </Button>
        </div>
      </div>
    </section>
  );
}

function SectionIntro({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <div className="max-w-3xl">
      <p className="font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base">{eyebrow}</p>
      <h2 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground">{lead}</p>
    </div>
  );
}

function ProductCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <article className="relative rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-foreground/20 sm:p-8">
      <p className="font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base">Step {step}</p>
      <h3 className="mt-3 font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold tracking-tight">LiSCA</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Live-cell imaging on single-cell arrays
          </p>
        </div>
        <a
          href={GITHUB_URL}
          rel="noopener noreferrer"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-md font-mono text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Github className="size-4" aria-hidden />
          github.com/{GITHUB_REPO}
        </a>
      </div>
    </footer>
  );
}
