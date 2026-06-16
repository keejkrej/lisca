import type { ReactNode } from "react";
import { Button } from "@lisca/ui/components";
import { ShellThemeToggle } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Github } from "lucide-react";

import { DemoEmbed } from "../components/demo-embed";
import { GITHUB_REPO, GITHUB_URL } from "../lib/constants";
import { landingDemos } from "../lib/demos";
import {
  IBIDI_MICROPATTERNED_LABWARE_URL,
  IBIDI_MIS_URL,
  landingAssays,
  landingProducts,
  SARTORIUS_SX5_URL,
  workflowSteps,
} from "../lib/landing-content";
import { scrollToSection } from "../lib/scroll-to-section";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const NAV = [
  { id: "how-it-works", label: "How it works" },
  { id: "assays", label: "Assays" },
  { id: "demos", label: "Demos" },
] as const;

function LandingPage() {
  const aligner = landingProducts.find((product) => product.id === "aligner");
  const annotator = landingProducts.find((product) => product.id === "annotator");
  const studio = landingProducts.find((product) => product.id === "studio");

  return (
    <div className="relative min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-4 py-2 font-mono text-sm outline-none focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to content
      </a>
      <Header />

      <main id="main" className="bg-background pt-16">
        <Hero />

        <section className="mx-auto max-w-6xl bg-background px-6 py-20 sm:py-28">
          <SectionIntro
            id="how-it-works"
            eyebrow="How it works"
            title="From patterned surface to assay readout"
            lead={
              <>
                Live-cell work on single-cell arrays begins with defined adhesion sites — on{" "}
                <ExternalLink href={IBIDI_MICROPATTERNED_LABWARE_URL}>prepatterned ibidi labware</ExternalLink>{" "}
                or surfaces you pattern with a photomask and the{" "}
                <ExternalLink href={IBIDI_MIS_URL}>Micro Illumination System</ExternalLink>. After seeding
                and timelapse imaging, LiSCA carries you from the first frame to summary tables and plots.
              </>
            }
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step) => (
              <WorkflowStepCard key={step.step} step={step.step} title={step.title} description={step.description} visual={step.visual} />
            ))}
          </div>

          <div className="texture-grain relative mt-12">
            <div className="grid gap-5 md:grid-cols-2">
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

        <section className="mx-auto max-w-6xl bg-background px-6 py-20 sm:py-28">
          <SectionIntro
            id="assays"
            eyebrow="Assays"
            title="Quantitative readouts for patterned-array experiments"
            lead="LiSCA ships with assay templates for the workflows labs run most often on single-cell arrays. Each template defines which channels to read, how sites are scored, and which summary plots Studio produces."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {landingAssays.map((assay) => (
              <AssayCard key={assay.id} assay={assay} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl bg-background px-6 py-20 sm:py-28">
          <SectionIntro
            id="demos"
            eyebrow="Demos"
            title="Try the workflow in your browser"
            lead="Each preview runs on a fixed sample frame so you can explore the tools immediately. Open the full demo to load your own images and export results."
          />
          <div className="mt-12 grid items-start gap-6 lg:grid-cols-2">
            {landingDemos.map((demo, index) => (
              <DemoEmbed key={demo.id} demo={demo} index={index} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <nav
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          aria-label="Primary"
        >
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="landing-control shrink-0 px-3 py-2 font-mono text-sm uppercase tracking-wider sm:text-base"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
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
    <section className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
      <div className="w-full max-w-4xl px-6 py-16 text-center sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
          micropatterned slides · live-cell imaging · single-cell arrays
        </p>
        <p className="mx-auto mt-5 inline-flex rounded-full border border-[color-mix(in_oklab,var(--accent-glow)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent-glow)_12%,transparent)] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-glow">
          Free &amp; open source — no license fee
        </p>
        <h1 className="mt-6 text-balance font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
          Live-cell imaging on{" "}
          <span className="text-glow">single-cell arrays</span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          LiSCA helps cell biologists and pharmacologists analyse micropatterned ibidi µ-Slides and
          custom photopatterns — whether you start from{" "}
          <ExternalLink href={IBIDI_MICROPATTERNED_LABWARE_URL}>prepatterned labware</ExternalLink> or
          define adhesion sites with the{" "}
          <ExternalLink href={IBIDI_MIS_URL}>Micro Illumination System</ExternalLink>. Align timelapse
          images to the grid, mark regions of interest on individual cells, and turn patterned-array
          experiments into quantitative assay readouts.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" size="lg" onClick={() => scrollToSection("how-it-works")}>
            How it works
            <ArrowRight aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => scrollToSection("demos")}>
            Demos
          </Button>
        </div>
      </div>
    </section>
  );
}

function SectionIntro({
  id,
  eyebrow,
  title,
  lead,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lead: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <p
        id={id}
        className="scroll-mt-20 font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base"
      >
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground">{lead}</p>
    </div>
  );
}

function ProductCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <article className="landing-surface relative rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
      <p className="font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base">Step {step}</p>
      <h3 className="mt-3 font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function WorkflowStepCard({
  step,
  title,
  description,
  visual,
}: {
  step: string;
  title: string;
  description: string;
  visual: (typeof workflowSteps)[number]["visual"];
}) {
  return (
    <article className="landing-surface flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60">
      <WorkflowVisual kind={visual} />
      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-glow">Step {step}</p>
        <h3 className="mt-2 font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </article>
  );
}

function WorkflowVisual({ kind }: { kind: (typeof workflowSteps)[number]["visual"] }) {
  return (
    <div
      aria-hidden
      className="relative aspect-[4/3] border-b border-border bg-[linear-gradient(145deg,color-mix(in_oklab,var(--accent-glow)_12%,transparent),transparent_55%)]"
    >
      <div className="absolute inset-3 grid grid-cols-4 grid-rows-3 gap-1.5 opacity-90">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            key={index}
            className={[
              "rounded-sm border border-border/60",
              kind === "raw" ? "bg-muted/70" : "",
              kind === "aligned" && index % 5 === 0 ? "border-destructive/70 bg-destructive/15" : "",
              kind === "aligned" && index % 5 !== 0 ? "border-[color-mix(in_oklab,var(--accent-glow)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent-glow)_10%,transparent)]" : "",
              kind === "annotated" && index % 4 === 0 ? "bg-[color-mix(in_oklab,var(--accent-glow)_25%,transparent)]" : "",
              kind === "annotated" && index % 4 !== 0 ? "bg-muted/50" : "",
              kind === "readout" ? "bg-muted/40" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </div>
      {kind === "readout" ? (
        <div className="absolute inset-x-6 bottom-5 top-auto flex h-16 items-end gap-1.5">
          {[38, 52, 44, 68, 58, 72, 49].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-sm bg-[color-mix(in_oklab,var(--accent-glow)_70%,transparent)]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      ) : null}
      {kind === "annotated" ? (
        <div className="absolute inset-0">
          <div className="absolute left-[18%] top-[22%] size-8 rounded-full border-2 border-[#22c55e]/80 bg-[#22c55e]/20" />
          <div className="absolute left-[52%] top-[48%] size-7 rounded-full border-2 border-[#3b82f6]/80 bg-[#3b82f6]/20" />
          <div className="absolute left-[70%] top-[28%] size-6 rounded-full border-2 border-[#f59e0b]/80 bg-[#f59e0b]/20" />
        </div>
      ) : null}
    </div>
  );
}

function AssayCard({ assay }: { assay: (typeof landingAssays)[number] }) {
  return (
    <article className="landing-surface flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60">
      <AssayVisual kind={assay.visual} />
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold">{assay.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{assay.summary}</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {assay.outputs.map((output) => (
            <li key={output} className="flex gap-2">
              <span className="text-glow" aria-hidden>
                ·
              </span>
              <span>{output}</span>
            </li>
          ))}
        </ul>
        {assay.id === "custom" ? (
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Inspired by modular live-cell platforms like the{" "}
            <ExternalLink href={SARTORIUS_SX5_URL}>Sartorius Incucyte SX5</ExternalLink>, where labs
            combine optical modules and application workflows for new readouts.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function AssayVisual({ kind }: { kind: (typeof landingAssays)[number]["visual"] }) {
  if (kind === "gene-expression") {
    return (
      <div aria-hidden className="relative aspect-[16/10] border-b border-border bg-muted/20 p-5">
        <svg viewBox="0 0 320 180" className="h-full w-full" role="presentation">
          <polyline
            fill="none"
            stroke="var(--accent-glow)"
            strokeWidth="2.5"
            points="10,150 50,130 90,118 130,95 170,88 210,62 250,48 290,35"
          />
          <polyline
            fill="none"
            stroke="color-mix(in oklab, var(--accent-glow) 45%, transparent)"
            strokeWidth="2"
            points="10,160 50,145 90,132 130,120 170,105 210,92 250,78 290,70"
          />
        </svg>
        <p className="absolute bottom-3 left-5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Fluorescence traces
        </p>
      </div>
    );
  }

  if (kind === "immune-killing") {
    return (
      <div aria-hidden className="relative aspect-[16/10] border-b border-border bg-muted/20 p-5">
        <svg viewBox="0 0 320 180" className="h-full w-full" role="presentation">
          <path
            d="M 10 40 C 80 40, 100 150, 170 150 S 260 150, 310 150"
            fill="none"
            stroke="var(--accent-glow)"
            strokeWidth="2.5"
          />
        </svg>
        <p className="absolute bottom-3 left-5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Kill curve
        </p>
      </div>
    );
  }

  return (
    <div aria-hidden className="relative aspect-[16/10] border-b border-border bg-muted/20 p-5">
      <div className="grid h-full grid-cols-3 gap-2">
        {["Segment", "Trace", "Score"].map((label) => (
          <div
            key={label}
            className="flex items-center justify-center rounded-lg border border-dashed border-border bg-card/60 text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-glow"
    >
      {children}
    </a>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold tracking-tight">LiSCA</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Live-cell imaging on single-cell arrays · free &amp; open source
          </p>
        </div>
        <a
          href={GITHUB_URL}
          rel="noopener noreferrer"
          target="_blank"
          className="landing-control inline-flex items-center gap-2 px-2 py-1 font-mono text-sm"
        >
          <Github className="size-4" aria-hidden />
          github.com/{GITHUB_REPO}
        </a>
      </div>
    </footer>
  );
}
