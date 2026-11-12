import { ASSAY_CHOICE_LABEL } from "@lisca/client/atoms/studio-ui";
import { StateToggleIndicator } from "@lisca/ui/patterns";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Toggle,
} from "@lisca/ui/primitives";
import { createSignal, For, Show } from "solid-js";

import {
  guideAreasForInterests,
  RESEARCH_AREAS,
  RESEARCH_INTEREST_OPTIONS,
  specificResearchAreasFromInterests,
  type AssayAreaFilter,
  type ResearchAreaId,
  type ResearchInterestId,
} from "../state/studio-onboarding";
import type { AssayId } from "../state/studio-store";
import { StudioResearchFigures } from "./studio-research-figures";

export type OnboardingStep = "interests" | "guide";

const STUDIO_WORKFLOW_PILLARS: readonly { step: string; title: string; detail: string }[] = [
  {
    step: "I–II",
    title: "Assay & Metadata",
    detail:
      "Read Positions, Channels, and Interval from ND2, CZI, or a templated TIFF folder without copying raw acquisition files, and group Positions into named Samples.",
  },
  {
    step: "III",
    title: "Micropattern Align & ROI crop",
    detail:
      "Fit square or hexagonal Pattern grids, track drift keyframes, exclude empty or multi-cell Patterns, and crop cell-centered ROI stacks.",
  },
  {
    step: "IV",
    title: "Annotate & Smart segment",
    detail:
      "Optional interactive SlimSAM Masks, phenotype classes, and label-free reference embeddings stored alongside ROI stacks.",
  },
  {
    step: "V",
    title: "Analysis & reproducible files",
    detail:
      "Write per-Position CSVs, per-Sample Excel workbooks, shared-axis PNG plots, and multi-page PDF reports in one portable Workspace.",
  },
];

export function StudioOnboardingInterestsStep(props: {
  selectedInterests: readonly ResearchInterestId[];
  onToggleInterest: (id: ResearchInterestId) => void;
  onContinue: () => void;
  onSkip: () => void;
  onOpenFeedback: () => void;
}) {
  return (
    <div class="flex w-full max-w-[44rem] min-w-0 flex-col gap-8">
      <div class="flex flex-col items-start gap-2.5">
        <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
          Step 01 of 02 · Personalize Studio
        </span>
        <h1 class="text-3xl font-semibold leading-9 tracking-[-0.025em] text-foreground">
          What do you study?
        </h1>
        <p class="text-sm leading-5 text-muted-foreground">
          Select one or more areas to see how LiSCA connects to your research questions, preview
          sample readouts and figures, and filter the Assay page to matching workflows.
        </p>
      </div>

      <div aria-label="Research interests" class="flex w-full flex-col gap-2.5" role="group">
        <For each={RESEARCH_INTEREST_OPTIONS}>
          {(option) => {
            const selected = () => props.selectedInterests.includes(option.id);
            return (
              <Button
                aria-pressed={selected()}
                class="h-auto w-full items-start justify-start gap-3.5 px-5 py-4 text-left whitespace-normal"
                data-instrument-state-toggle=""
                type="button"
                variant="secondary"
                onClick={() => props.onToggleInterest(option.id)}
              >
                <span class="mt-0.5 flex shrink-0 items-center">
                  <StateToggleIndicator pressed={selected()} />
                </span>
                <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span class="text-base font-medium leading-5">{option.title}</span>
                  <span
                    class={
                      selected()
                        ? "text-sm font-normal leading-5 text-primary-foreground/80"
                        : "text-sm font-normal leading-5 text-muted-foreground"
                    }
                  >
                    {option.description}
                  </span>
                </span>
              </Button>
            );
          }}
        </For>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button size="default" type="button" variant="ghost" onClick={props.onOpenFeedback}>
          Help us improve LiSCA
        </Button>
        <div class="flex items-center gap-2.5">
          <Button size="default" type="button" variant="outline" onClick={props.onSkip}>
            Skip to assays
          </Button>
          <Button size="default" type="button" onClick={props.onContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StudioOnboardingGuideStep(props: {
  selectedInterests: readonly ResearchInterestId[];
  onBackToInterests: () => void;
  onFinishToAssays: (preferredArea?: AssayAreaFilter) => void;
  onPickAssay: (assayId: AssayId, areaId: ResearchAreaId) => void;
  onOpenFeedback: () => void;
}) {
  const [showAllAreas, setShowAllAreas] = createSignal(false);
  const specificChosen = () => specificResearchAreasFromInterests(props.selectedInterests);
  const tailoredAreas = () => guideAreasForInterests(props.selectedInterests);
  const visibleAreas = () => (showAllAreas() ? RESEARCH_AREAS : tailoredAreas());
  const canExpandAll = () => tailoredAreas().length < RESEARCH_AREAS.length;

  return (
    <div class="flex w-full max-w-[56rem] min-w-0 flex-col gap-10">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex max-w-[40rem] flex-col gap-2">
            <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
              Step 02 of 02 · Research Guide
            </span>
            <h1 class="text-3xl font-semibold leading-9 tracking-[-0.025em] text-foreground">
              How LiSCA can help your research
            </h1>
            <p class="text-sm leading-5 text-muted-foreground">
              Each workflow links a biological question to per-ROI measurements, illustrative sample
              figures and output tables, and the underlying method literature.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Show when={canExpandAll()}>
              <Toggle
                aria-pressed={showAllAreas()}
                class="h-8 gap-2 px-3 text-xs"
                data-instrument-state-toggle=""
                pressed={showAllAreas()}
                size="sm"
                variant="outline"
                onChange={setShowAllAreas}
              >
                <StateToggleIndicator pressed={showAllAreas()} />
                <span>Show all areas</span>
              </Toggle>
            </Show>
            <Button size="sm" type="button" variant="outline" onClick={props.onBackToInterests}>
              Change research interests
            </Button>
          </div>
        </div>

        <Show when={specificChosen().length > 0}>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-muted-foreground">Selected focus:</span>
            <For each={specificChosen()}>
              {(id) => {
                const area = RESEARCH_AREAS.find((entry) => entry.id === id);
                return <Badge variant="secondary">{area?.title ?? id}</Badge>;
              }}
            </For>
          </div>
        </Show>
      </div>

      <div class="flex flex-col gap-8">
        <For each={visibleAreas()}>
          {(area) => (
            <Card class="border border-border bg-background">
              <CardHeader class="gap-2 border-b border-border pb-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
                    Research area
                  </span>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <For each={area.assayIds}>
                      {(assayId) => <Badge variant="outline">{ASSAY_CHOICE_LABEL[assayId]}</Badge>}
                    </For>
                  </div>
                </div>
                <CardTitle class="text-xl font-semibold leading-7 text-foreground">
                  {area.title}
                </CardTitle>
                <CardDescription class="text-sm leading-5 text-foreground/90">
                  <span class="font-medium text-muted-foreground">Research question: </span>
                  {area.researchQuestion}
                </CardDescription>
              </CardHeader>

              <CardContent class="flex flex-col gap-6 pt-5">
                <Show when={area.boundaryBody}>
                  <Alert>
                    <Show when={area.boundaryTitle}>
                      <AlertTitle>{area.boundaryTitle}</AlertTitle>
                    </Show>
                    <AlertDescription>{area.boundaryBody}</AlertDescription>
                  </Alert>
                </Show>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <For each={area.features}>
                    {(feature) => (
                      <div class="flex flex-col gap-1.5 border border-border bg-muted/20 p-3.5">
                        <h3 class="text-sm font-semibold leading-5 text-foreground">
                          {feature.title}
                        </h3>
                        <p class="text-xs leading-relaxed text-muted-foreground">
                          {feature.detail}
                        </p>
                      </div>
                    )}
                  </For>
                </div>

                <StudioResearchFigures areaId={area.id} />

                <div class="flex flex-col gap-2">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <h3 class="text-xs font-semibold uppercase leading-4 tracking-[0.1em] text-muted-foreground">
                      Sample Workspace output preview
                    </h3>
                    <span class="text-xs text-muted-foreground">{area.sampleReadout.caption}</span>
                  </div>
                  <div class="border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <For each={area.sampleReadout.columns}>
                            {(column) => (
                              <TableHead class="text-xs font-semibold">{column}</TableHead>
                            )}
                          </For>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <For each={area.sampleReadout.rows}>
                          {(row) => (
                            <TableRow>
                              <For each={row}>
                                {(cell, cellIndex) => (
                                  <TableCell
                                    class={
                                      cellIndex() === 0
                                        ? "text-xs font-medium text-foreground"
                                        : "text-xs tabular-nums text-muted-foreground"
                                    }
                                  >
                                    {cell}
                                  </TableCell>
                                )}
                              </For>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div class="flex flex-col gap-1.5 border-t border-border pt-3">
                  <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
                    Supporting literature & method references
                  </span>
                  <ul class="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
                    <For each={area.references}>
                      {(ref) => (
                        <li>
                          <span class="font-medium text-foreground">{ref.label}: </span>
                          {ref.citation}
                        </li>
                      )}
                    </For>
                  </ul>
                  <p class="text-xs text-muted-foreground">
                    A citable reference for LiSCA is in preparation; report your Studio version
                    alongside the method papers above.
                  </p>
                </div>
              </CardContent>

              <CardFooter class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span class="text-xs text-muted-foreground">
                  Open this area on the Assay page to configure a new Workspace or resume a saved
                  run.
                </span>
                <div class="flex flex-wrap items-center gap-2">
                  <For each={area.assayIds}>
                    {(assayId) => (
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => props.onPickAssay(assayId, area.id)}
                      >
                        Use {ASSAY_CHOICE_LABEL[assayId]}
                      </Button>
                    )}
                  </For>
                </div>
              </CardFooter>
            </Card>
          )}
        </For>
      </div>

      <Separator />

      <section aria-labelledby="studio-shared-workflow-heading" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
            Product workflow
          </span>
          <h2
            id="studio-shared-workflow-heading"
            class="text-xl font-semibold leading-7 text-foreground"
          >
            One Workspace from microscope acquisition to figures
          </h2>
          <p class="text-sm leading-5 text-muted-foreground">
            Across every assay, LiSCA Studio keeps image source metadata, micropattern alignment,
            cropped ROIs, annotations, and analysis outputs together on disk.
          </p>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <For each={STUDIO_WORKFLOW_PILLARS}>
            {(pillar) => (
              <div class="flex flex-col gap-1.5 border border-border bg-background p-4">
                <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
                  Step {pillar.step}
                </span>
                <h3 class="text-sm font-semibold leading-5 text-foreground">{pillar.title}</h3>
                <p class="text-xs leading-relaxed text-muted-foreground">{pillar.detail}</p>
              </div>
            )}
          </For>
        </div>
      </section>

      <div class="flex flex-wrap items-center justify-between gap-4 border border-border bg-muted/20 p-5">
        <div class="flex max-w-[34rem] flex-col gap-1">
          <h2 class="text-sm font-semibold leading-5 text-foreground">Help us improve LiSCA</h2>
          <p class="text-xs leading-relaxed text-muted-foreground">
            Studying another assay or missing a measurement? Share what you study and what your
            workflow needs on a separate, optional feedback page.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <Button size="default" type="button" variant="outline" onClick={props.onOpenFeedback}>
            Help us improve LiSCA
          </Button>
          <Button size="default" type="button" onClick={() => props.onFinishToAssays()}>
            Continue to Assay
          </Button>
        </div>
      </div>
    </div>
  );
}
