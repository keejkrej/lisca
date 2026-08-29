import type { JSX } from "solid-js";
import { For, Index, Show } from "solid-js";
import { buttonVariants, cn } from "@lisca/ui/components";
import { ShellThemeToggle } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/solid-router";
import IconGithubLogoRegular from "phosphor-icons-solid/IconGithubLogoRegular";

import { DemoEmbed } from "../components/demo-embed";
import { GITHUB_REPO, GITHUB_URL } from "../lib/constants";
import { landingDemos } from "../lib/demos";
import {
  IBIDI_MICROPATTERNED_LABWARE_URL,
  IBIDI_MIS_URL,
  landingAssays,
  landingProducts,
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

const WORKFLOW_CELL_INDICES = Array.from({ length: 12 }, (_, index) => index);
const READOUT_BAR_HEIGHTS = [38, 52, 44, 68, 58, 72, 49];

function LandingPage() {
  const aligner = landingProducts.find((product) => product.id === "aligner");
  const annotator = landingProducts.find((product) => product.id === "annotator");
  const studio = landingProducts.find((product) => product.id === "studio");

  return (
    <div class="relative min-h-dvh bg-background">
      <a
        href="#main"
        class="sr-only rounded-md bg-background px-4 py-2 font-mono text-sm outline-none focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to content
      </a>
      <Header />

      <main id="main" class="bg-background pt-16">
        <Hero />

        <section class="mx-auto max-w-6xl bg-background px-6 py-20 sm:py-28">
          <SectionIntro
            id="how-it-works"
            eyebrow="How it works"
            title="From patterned surface to assay readout"
            lead={
              <>
                Live-cell work on single-cell arrays begins with defined adhesion micropatterns — on{" "}
                <ExternalLink href={IBIDI_MICROPATTERNED_LABWARE_URL}>
                  prepatterned ibidi labware
                </ExternalLink>{" "}
                or surfaces you pattern with a photomask and the{" "}
                <ExternalLink href={IBIDI_MIS_URL}>Micro Illumination System</ExternalLink>. After
                seeding and timelapse imaging, LiSCA carries you from the first frame to summary
                tables and plots.
              </>
            }
          />

          <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <For each={workflowSteps}>
              {(step) => (
                <WorkflowStepCard
                  step={step.step}
                  title={step.title}
                  description={step.description}
                  visual={step.visual}
                />
              )}
            </For>
          </div>

          <div class="texture-grain relative mt-12">
            <div class="grid gap-5 md:grid-cols-2">
              <Show when={aligner}>
                <ProductCard
                  eyebrow="Standalone · Grid alignment"
                  title={aligner!.title}
                  body={aligner!.description}
                />
              </Show>
              <Show when={annotator}>
                <ProductCard
                  eyebrow="Standalone · Annotation"
                  title={annotator!.title}
                  body={annotator!.description}
                />
              </Show>
            </div>

            <Show when={studio}>
              <article class="mt-5 overflow-hidden rounded-2xl border border-border bg-card/60">
                <div class="flex flex-col gap-3 border-b border-border p-6 sm:p-8">
                  <p class="font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base">
                    End-to-end analysis
                  </p>
                  <h3 class="font-display text-2xl font-semibold">{studio!.title}</h3>
                  <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {studio!.description}
                  </p>
                </div>
              </article>
            </Show>

            <article class="landing-surface mt-5 overflow-hidden rounded-2xl border border-border bg-card/60">
              <div class="flex flex-col gap-3 p-6 sm:p-8">
                <p class="font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base">
                  Platform philosophy
                </p>
                <h3 class="font-display text-2xl font-semibold">
                  Built for the micropatterning workflow
                </h3>
                <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  LiSCA is designed around prepatterned µ-Slides, photopatterned surfaces, and the
                  rest of the micropatterning ecosystem. That shared geometry yields standardized,
                  cell-level readouts that stay comparable across wells, time points, and
                  experiments — more so than on unpatterned substrates where cell position and
                  context vary freely.
                </p>
                <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Each micropattern maps to one ROI and usually one cell, so heavy segmentation is
                  rarely needed — a quick visual check on occupancy or morphology is enough to
                  include or exclude a pattern from the analysis.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section class="mx-auto max-w-6xl bg-background px-6 py-20 sm:py-28">
          <SectionIntro
            id="assays"
            eyebrow="Assays"
            title="Quantitative readouts for patterned-array experiments"
            lead="LiSCA ships with assay templates for the workflows labs run most often on single-cell arrays. Each template defines which channels to read, how cells are scored, and which summary plots Studio produces."
          />
          <div class="mt-12 grid gap-5 lg:grid-cols-3">
            <For each={landingAssays}>{(assay) => <AssayCard assay={assay} />}</For>
          </div>
        </section>

        <section class="mx-auto max-w-6xl bg-background px-6 py-20 sm:py-28">
          <SectionIntro
            id="demos"
            eyebrow="Demos"
            title="Try the workflow in your browser"
            lead="Play with our sample files here, or open the full demo to use your own images and download results."
          />
          <div class="mt-12 grid items-start gap-6 lg:grid-cols-2">
            <Index each={landingDemos}>
              {(demo, index) => <DemoEmbed demo={demo()} index={index} />}
            </Index>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header class="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <nav class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Primary">
          <For each={NAV}>
            {(item) => (
              <button
                type="button"
                onClick={() => scrollToSection(item.id)}
                class="landing-control shrink-0 px-3 py-2 font-mono text-sm uppercase tracking-wider sm:text-base"
              >
                {item.label}
              </button>
            )}
          </For>
        </nav>

        <div class="flex shrink-0 items-center gap-1">
          <a
            href={GITHUB_URL}
            rel="noopener noreferrer"
            target="_blank"
            aria-label="Project repository on GitHub"
            class={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <IconGithubLogoRegular />
          </a>
          <ShellThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section class="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
      <div class="w-full max-w-4xl px-6 py-16 text-center sm:py-20">
        <p class="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
          micropatterned slides · live-cell imaging · single-cell arrays
        </p>
        <p class="mx-auto mt-5 inline-flex rounded-full border border-[color-mix(in_oklab,var(--accent-glow)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent-glow)_12%,transparent)] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-glow">
          Free &amp; open source
        </p>
        <h1 class="mt-6 text-balance font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
          Live-cell imaging on <span class="text-glow">single-cell arrays</span>
        </h1>
        <p class="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          LiSCA helps cell biologists and pharmacologists analyse micropatterned experiments —
          whether you start from{" "}
          <ExternalLink href={IBIDI_MICROPATTERNED_LABWARE_URL}>
            ibidi µ-Pattern ibiTreat
          </ExternalLink>{" "}
          or define custom adhesion micropatterns with the{" "}
          <ExternalLink href={IBIDI_MIS_URL}>Micro Illumination System</ExternalLink>. Align
          timelapse images to the grid to define the ROI of each micropattern, annotate features of
          interest on those cell-level ROIs, and turn them into quantitative assay readouts.
        </p>
      </div>
    </section>
  );
}

function SectionIntro(props: { id?: string; eyebrow: string; title: string; lead: JSX.Element }) {
  return (
    <div class="max-w-3xl">
      <p
        id={props.id}
        class="scroll-mt-20 font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base"
      >
        {props.eyebrow}
      </p>
      <h2 class="mt-4 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {props.title}
      </h2>
      <p class="mt-5 text-base leading-relaxed text-muted-foreground">{props.lead}</p>
    </div>
  );
}

function ProductCard(props: { eyebrow: string; title: string; body: string }) {
  return (
    <article class="landing-surface relative rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
      <p class="font-mono text-sm uppercase tracking-[0.14em] text-glow sm:text-base">
        {props.eyebrow}
      </p>
      <h3 class="mt-3 font-display text-2xl font-semibold">{props.title}</h3>
      <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{props.body}</p>
    </article>
  );
}

function WorkflowStepCard(props: {
  step: string;
  title: string;
  description: string;
  visual: (typeof workflowSteps)[number]["visual"];
}) {
  return (
    <article class="landing-surface flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60">
      <WorkflowVisual kind={props.visual} />
      <div class="flex flex-1 flex-col p-5">
        <p class="font-mono text-xs uppercase tracking-[0.14em] text-glow">Step {props.step}</p>
        <h3 class="mt-2 font-display text-lg font-semibold">{props.title}</h3>
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{props.description}</p>
      </div>
    </article>
  );
}

function WorkflowVisual(props: { kind: (typeof workflowSteps)[number]["visual"] }) {
  return (
    <div
      aria-hidden
      class="relative aspect-[4/3] border-b border-border bg-[linear-gradient(145deg,color-mix(in_oklab,var(--accent-glow)_12%,transparent),transparent_55%)]"
    >
      <div class="absolute inset-3 grid grid-cols-4 grid-rows-3 gap-1.5 opacity-90">
        <Index each={WORKFLOW_CELL_INDICES}>
          {(_, index) => (
            <div
              class={[
                "rounded-sm border border-border/60",
                props.kind === "raw" ? "bg-muted/70" : "",
                props.kind === "aligned" && index % 5 === 0
                  ? "border-destructive/70 bg-destructive/15"
                  : "",
                props.kind === "aligned" && index % 5 !== 0
                  ? "border-[color-mix(in_oklab,var(--accent-glow)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent-glow)_10%,transparent)]"
                  : "",
                props.kind === "annotated" && index % 4 === 0
                  ? "bg-[color-mix(in_oklab,var(--accent-glow)_25%,transparent)]"
                  : "",
                props.kind === "annotated" && index % 4 !== 0 ? "bg-muted/50" : "",
                props.kind === "readout" ? "bg-muted/40" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          )}
        </Index>
      </div>
      <Show when={props.kind === "readout"}>
        <div class="absolute inset-x-6 bottom-5 top-auto flex h-16 items-end gap-1.5">
          <Index each={READOUT_BAR_HEIGHTS}>
            {(height) => (
              <div
                class="flex-1 rounded-t-sm bg-[color-mix(in_oklab,var(--accent-glow)_70%,transparent)]"
                style={{ height: `${height()}%` }}
              />
            )}
          </Index>
        </div>
      </Show>
      <Show when={props.kind === "annotated"}>
        <div class="absolute inset-0">
          <div class="absolute left-[18%] top-[22%] size-8 rounded-full border-2 border-[#22c55e]/80 bg-[#22c55e]/20" />
          <div class="absolute left-[52%] top-[48%] size-7 rounded-full border-2 border-[#3b82f6]/80 bg-[#3b82f6]/20" />
          <div class="absolute left-[70%] top-[28%] size-6 rounded-full border-2 border-[#f59e0b]/80 bg-[#f59e0b]/20" />
        </div>
      </Show>
    </div>
  );
}

function AssayCard(props: { assay: (typeof landingAssays)[number] }) {
  return (
    <article class="landing-surface flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60">
      <AssayVisual kind={props.assay.visual} />
      <div class="flex flex-1 flex-col p-6">
        <h3 class="font-display text-xl font-semibold">{props.assay.name}</h3>
        <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{props.assay.summary}</p>
        <ul class="mt-4 space-y-2 text-sm text-muted-foreground">
          <For each={props.assay.outputs}>
            {(output) => (
              <li class="flex gap-2">
                <span class="text-glow" aria-hidden>
                  ·
                </span>
                <span>{output}</span>
              </li>
            )}
          </For>
        </ul>
      </div>
    </article>
  );
}

function AssayVisual(props: { kind: (typeof landingAssays)[number]["visual"] }) {
  return (
    <Show
      when={props.kind === "transfection"}
      fallback={
        <div aria-hidden class="relative aspect-[16/10] border-b border-border bg-muted/20 p-5">
          <svg viewBox="0 0 320 180" class="h-full w-full" role="presentation">
            <path
              d="M 10 40 C 80 40, 100 150, 170 150 S 260 150, 310 150"
              fill="none"
              stroke="var(--accent-glow)"
              stroke-width="2.5"
            />
          </svg>
          <p class="absolute bottom-3 left-5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Kill curve
          </p>
        </div>
      }
    >
      <div aria-hidden class="relative aspect-[16/10] border-b border-border bg-muted/20 p-5">
        <svg viewBox="0 0 320 180" class="h-full w-full" role="presentation">
          <polyline
            fill="none"
            stroke="var(--accent-glow)"
            stroke-width="2.5"
            points="10,150 50,130 90,118 130,95 170,88 210,62 250,48 290,35"
          />
          <polyline
            fill="none"
            stroke="color-mix(in oklab, var(--accent-glow) 45%, transparent)"
            stroke-width="2"
            points="10,160 50,145 90,132 130,120 170,105 210,92 250,78 290,70"
          />
        </svg>
        <p class="absolute bottom-3 left-5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Fluorescence traces
        </p>
      </div>
    </Show>
  );
}

function ExternalLink(props: { href: string; children: JSX.Element }) {
  return (
    <a
      href={props.href}
      rel="noopener noreferrer"
      target="_blank"
      class="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-glow"
    >
      {props.children}
    </a>
  );
}

function Footer() {
  return (
    <footer class="border-t border-border">
      <div class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="font-display text-lg font-bold tracking-tight">LiSCA</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Live-cell imaging on single-cell arrays · free &amp; open source
          </p>
        </div>
        <a
          href={GITHUB_URL}
          rel="noopener noreferrer"
          target="_blank"
          class="landing-control inline-flex items-center gap-2 px-2 py-1 font-mono text-sm"
        >
          <IconGithubLogoRegular class="size-4" />
          github.com/{GITHUB_REPO}
        </a>
      </div>
    </footer>
  );
}
