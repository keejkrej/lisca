import type { Html } from "@effect/ui/html";
import { ASSAY_CHOICE_LABEL } from "@lisca/client/atoms/studio-ui";
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
} from "@lisca/ui/primitives";

import { RESEARCH_AREAS } from "../state/studio-onboarding";
import type { AssayId } from "../state/studio-store";
import { StudioResearchFigures } from "./studio-research-figures";

const STUDIO_WORKFLOW_PILLARS: readonly {
  readonly step: string;
  readonly title: string;
  readonly detail: string;
}[] = [
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

export type StudioOnboardingGuideStepOptions<M> = {
  readonly onFinishToAssays: M;
  readonly onPickAssay: (assayId: AssayId) => M;
  readonly onOpenFeedback: M;
};

export function StudioOnboardingGuideStep<M>(
  h: Html.H<M>,
  options: StudioOnboardingGuideStepOptions<M>,
) {
  return h.div.class("flex w-full max-w-[56rem] min-w-0 flex-col gap-10").children(
    h.div
      .class("flex flex-col gap-4")
      .children(
        h.div
          .class("flex flex-wrap items-start justify-between gap-4")
          .children(
            h.div
              .class("flex max-w-[40rem] flex-col gap-2")
              .children(
                h.span
                  .class(
                    "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
                  )
                  .children("Research guide"),
                h.h1
                  .class("text-3xl font-semibold leading-9 tracking-[-0.025em] text-foreground")
                  .children("How LiSCA can help your research"),
                h.p
                  .class("text-sm leading-5 text-muted-foreground")
                  .children(
                    "Each workflow links a biological question to per-ROI measurements, illustrative sample figures and output tables, and the underlying method literature.",
                  ),
              ),
          ),
      ),
    h.div.class("flex flex-col gap-8").children(
      ...RESEARCH_AREAS.map((area) =>
        Card(h, { class: "border border-border bg-background" })
          .key(area.id)
          .children(
            CardHeader(h, { class: "gap-2 border-b border-border pb-4" }).children(
              h.div
                .class("flex flex-wrap items-center justify-between gap-2")
                .children(
                  h.span
                    .class(
                      "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
                    )
                    .children("Research area"),
                  h.div
                    .class("flex flex-wrap items-center gap-1.5")
                    .children(
                      ...area.assayIds.map((assayId) =>
                        Badge(h, { variant: "outline" })
                          .key(assayId)
                          .children(ASSAY_CHOICE_LABEL[assayId]),
                      ),
                    ),
                ),
              CardTitle(h, { class: "text-xl font-semibold leading-7 text-foreground" }).children(
                area.title,
              ),
              CardDescription(h, { class: "text-sm leading-5 text-foreground/90" }).children(
                h.span.class("font-medium text-muted-foreground").children("Research question: "),
                area.researchQuestion,
              ),
            ),
            CardContent(h, { class: "flex flex-col gap-6 pt-5" }).children(
              area.boundaryBody
                ? Alert(h).children(
                    area.boundaryTitle ? AlertTitle(h).children(area.boundaryTitle) : undefined,
                    AlertDescription(h).children(area.boundaryBody),
                  )
                : undefined,
              h.div
                .class("grid grid-cols-1 gap-3 md:grid-cols-2")
                .children(
                  ...area.features.map((feature) =>
                    h.div
                      .key(feature.title)
                      .class("flex flex-col gap-1.5 border border-border bg-muted/20 p-3.5")
                      .children(
                        h.h3
                          .class("text-sm font-semibold leading-5 text-foreground")
                          .children(feature.title),
                        h.p
                          .class("text-xs leading-relaxed text-muted-foreground")
                          .children(feature.detail),
                      ),
                  ),
                ),
              StudioResearchFigures(h, { areaId: area.id }),
              h.div.class("flex flex-col gap-2").children(
                h.div
                  .class("flex flex-wrap items-center justify-between gap-2")
                  .children(
                    h.h3
                      .class(
                        "text-xs font-semibold uppercase leading-4 tracking-[0.1em] text-muted-foreground",
                      )
                      .children("Sample Workspace output preview"),
                    h.span
                      .class("text-xs text-muted-foreground")
                      .children(area.sampleReadout.caption),
                  ),
                h.div.class("border border-border").children(
                  Table(h).children(
                    TableHeader(h).children(
                      TableRow(h).children(
                        ...area.sampleReadout.columns.map((column) =>
                          TableHead(h, { class: "text-xs font-semibold" })
                            .key(column)
                            .children(column),
                        ),
                      ),
                    ),
                    TableBody(h).children(
                      ...area.sampleReadout.rows.map((row, rowIndex) =>
                        TableRow(h)
                          .key(String(rowIndex))
                          .children(
                            ...row.map((cell, cellIndex) =>
                              TableCell(h, {
                                class:
                                  cellIndex === 0
                                    ? "text-xs font-medium text-foreground"
                                    : "text-xs tabular-nums text-muted-foreground",
                              })
                                .key(String(cellIndex))
                                .children(cell),
                            ),
                          ),
                      ),
                    ),
                  ),
                ),
              ),
              h.div
                .class("flex flex-col gap-1.5 border-t border-border pt-3")
                .children(
                  h.span
                    .class(
                      "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
                    )
                    .children("Supporting literature & method references"),
                  h.ul
                    .class("flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground")
                    .children(
                      ...area.references.map((ref) =>
                        h.li
                          .key(ref.label)
                          .children(
                            h.span.class("font-medium text-foreground").children(`${ref.label}: `),
                            ref.citation,
                          ),
                      ),
                    ),
                  h.p
                    .class("text-xs text-muted-foreground")
                    .children(
                      "A citable reference for LiSCA is in preparation; report your Studio version alongside the method papers above.",
                    ),
                ),
            ),
            CardFooter(h, {
              class:
                "flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4",
            }).children(
              h.span
                .class("text-xs text-muted-foreground")
                .children(
                  "Choose an assay to configure a new Workspace, or open a saved run on the Assay page.",
                ),
              h.div.class("flex flex-wrap items-center gap-2").children(
                ...area.assayIds.map((assayId) =>
                  Button(h, {
                    size: "sm",
                    type: "button",
                    variant: "outline",
                    onPress: options.onPickAssay(assayId),
                  })
                    .key(assayId)
                    .children(`Use ${ASSAY_CHOICE_LABEL[assayId]}`),
                ),
              ),
            ),
          ),
      ),
    ),
    Separator(h),
    h.section
      .attr("aria-labelledby", "studio-shared-workflow-heading")
      .class("flex flex-col gap-4")
      .children(
        h.div
          .class("flex flex-col gap-1.5")
          .children(
            h.span
              .class(
                "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
              )
              .children("Product workflow"),
            h.h2
              .id("studio-shared-workflow-heading")
              .class("text-xl font-semibold leading-7 text-foreground")
              .children("One Workspace from microscope acquisition to figures"),
            h.p
              .class("text-sm leading-5 text-muted-foreground")
              .children(
                "Across every assay, LiSCA Studio keeps image source metadata, micropattern alignment, cropped ROIs, annotations, and analysis outputs together on disk.",
              ),
          ),
        h.div.class("grid grid-cols-1 gap-3 sm:grid-cols-2").children(
          ...STUDIO_WORKFLOW_PILLARS.map((pillar) =>
            h.div
              .key(pillar.step)
              .class("flex flex-col gap-1.5 border border-border bg-background p-4")
              .children(
                h.span
                  .class(
                    "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
                  )
                  .children(`Step ${pillar.step}`),
                h.h3
                  .class("text-sm font-semibold leading-5 text-foreground")
                  .children(pillar.title),
                h.p.class("text-xs leading-relaxed text-muted-foreground").children(pillar.detail),
              ),
          ),
        ),
      ),
    h.div
      .class(
        "flex flex-wrap items-center justify-between gap-4 border border-border bg-muted/20 p-5",
      )
      .children(
        h.div
          .class("flex max-w-[34rem] flex-col gap-1")
          .children(
            h.h2
              .class("text-sm font-semibold leading-5 text-foreground")
              .children("Help us improve LiSCA"),
            h.p
              .class("text-xs leading-relaxed text-muted-foreground")
              .children(
                "Studying another assay or missing a measurement? Share what you study and what your workflow needs on a separate, optional feedback page.",
              ),
          ),
        h.div.class("flex flex-wrap items-center gap-2.5").children(
          Button(h, {
            size: "default",
            type: "button",
            variant: "outline",
            onPress: options.onOpenFeedback,
          }).children("Help us improve LiSCA"),
          Button(h, {
            size: "default",
            type: "button",
            onPress: options.onFinishToAssays,
          }).children("Continue to Assay"),
        ),
      ),
  );
}
