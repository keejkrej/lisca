import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";

import { Button } from "../../components/ui/button";
import { Icon } from "../../icons";
import { cn } from "../../lib/utils";
import { ModalScrim } from "../../patterns/modal/modal-scrim";

export const QuickGuideTopicIdSchema = Schema.Literals([
  "assay",
  "metadata",
  "align",
  "annotate",
  "analysis",
  "aligner",
  "annotator",
]);

export type QuickGuideTopicId = typeof QuickGuideTopicIdSchema.Type;

type QuickGuideStep = {
  readonly number: string;
  readonly title: string;
  readonly body: string;
};

type QuickGuideShortcut = {
  readonly keys: string;
  readonly label: string;
};

type QuickGuideTopic = {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly steps: readonly QuickGuideStep[];
  readonly shortcuts: readonly QuickGuideShortcut[];
  readonly manualPath: string;
};

const MANUAL_BASE_URL = "https://keejkrej.github.io/lisca/";

export const QUICK_GUIDE_TOPICS: Record<QuickGuideTopicId, QuickGuideTopic> = {
  assay: {
    eyebrow: "Step 01 · Assay",
    title: "Choose an assay",
    subtitle:
      "Select the single-cell workflow that matches your acquisition and open or create a workspace.",
    steps: [
      {
        number: "01",
        title: "Pick the assay module",
        body: "Choose Transfection, Killing (death reporter or engagement), or LNP binding. Each module preconfigures required channels and downstream plots.",
      },
      {
        number: "02",
        title: "Create or resume a workspace",
        body: "Point Studio at an empty folder for a new experiment or reopen an existing workspace with assay.json.",
      },
      {
        number: "03",
        title: "Continue to Metadata",
        body: "Studio saves assay.json in the workspace root and advances to source, channel, and sample mapping.",
      },
    ],
    shortcuts: [
      { keys: "Ctrl/⌘ 1–5", label: "Jump between Studio steps" },
      { keys: "Ctrl/⌘ E", label: "Toggle Basic / Expert view" },
    ],
    manualPath: "",
  },
  metadata: {
    eyebrow: "Step 02 · Metadata",
    title: "Link source & map conditions",
    subtitle:
      "Read microscope metadata from ND2, CZI, or an image folder without duplicating raw movie bytes.",
    steps: [
      {
        number: "01",
        title: "Attach the raw acquisition",
        body: "Select an ND2 file, CZI file, or templated TIFF folder. Studio scans positions, channels, timepoints, and Z planes.",
      },
      {
        number: "02",
        title: "Assign assay channels",
        body: "Map brightfield, pattern, reporter, or spot channels and set frame interval and pixel size.",
      },
      {
        number: "03",
        title: "Group positions into samples",
        body: "Assign position ranges (for example 0-3, 4-7) to named experimental conditions before alignment.",
      },
    ],
    shortcuts: [
      { keys: "Ctrl/⌘ S", label: "Save metadata" },
      { keys: "Ctrl/⌘ 1–5", label: "Switch Studio step" },
    ],
    manualPath: "",
  },
  align: {
    eyebrow: "Step 03 · Align & Crop",
    title: "Register the micropattern grid",
    subtitle:
      "Fit the lattice to each position, exclude empty or debris islands, and crop single-cell ROI stacks.",
    steps: [
      {
        number: "01",
        title: "Auto-detect or refine the grid",
        body: "Run Detect on the pattern channel, then fine-tune translation, angle, spacing, or per-frame drift keyframes in Expert mode.",
      },
      {
        number: "02",
        title: "Filter unusable islands",
        body: "Use Edge exclude, Log-std exclude, or Edit mode clicks to drop empty, multi-cell, or debris islands.",
      },
      {
        number: "03",
        title: "Save & Crop ROIs",
        body: "Save per-position grids and run Crop to write analysis-ready Pos*/crops/*.tif stacks into the workspace.",
      },
    ],
    shortcuts: [
      { keys: "← / → or [ / ]", label: "Previous / next time frame" },
      { keys: "1–4", label: "Pan, Rotate, Spacing, Size" },
      { keys: "Ctrl/⌘ ←/→", label: "Previous / next position" },
      { keys: "Ctrl/⌘ S", label: "Save current position" },
    ],
    manualPath: "",
  },
  annotate: {
    eyebrow: "Step 04 · Annotate",
    title: "Label phenotypes, masks & references",
    subtitle:
      "Inspect single-cell ROI time series, paint or prompt segmentation masks, and run label-free classification.",
    steps: [
      {
        number: "01",
        title: "Define classes or mask layers",
        body: "Switch between Classification and Segmentation, then add named color-coded labels in the right rail.",
      },
      {
        number: "02",
        title: "Paint, lasso, or Smart segment",
        body: "Use Brush (1), Lasso (2), or Smart (3) point prompts for instant SlimSAM cell masks; scrub frames with ← / → or [ / ].",
      },
      {
        number: "03",
        title: "Save or build label-free references",
        body: "Save annotations to annotations.json, or embed labeled examples in the Label-free panel to classify unannotated ROIs.",
      },
    ],
    shortcuts: [
      { keys: "← / → or [ / ]", label: "Previous / next time frame" },
      { keys: "1–5", label: "Brush, Lasso, Smart, Erase, Zoom" },
      { keys: "Shift 1–9", label: "Select or toggle label" },
      { keys: "Ctrl/⌘ S", label: "Save current ROI" },
    ],
    manualPath: "",
  },
  analysis: {
    eyebrow: "Step 05 · Analysis",
    title: "Quantify traces & export figures",
    subtitle:
      "Run assay pipelines on cropped ROIs to produce per-cell kinetics, survival curves, CSVs, and publication plots.",
    steps: [
      {
        number: "01",
        title: "Run the assay pipeline",
        body: "Start Analysis to extract background-corrected traces, spot counts, onset kinetics, or death-reporter survival curves.",
      },
      {
        number: "02",
        title: "Compare conditions & shared axes",
        body: "Browse per-sample trace grids, summary curves, survival curves, and onset/death-time distributions.",
      },
      {
        number: "03",
        title: "Inspect workspace outputs",
        body: "Every plot and table is written directly under analysis/ and results/ as standard CSV, XLSX, and PNG files.",
      },
    ],
    shortcuts: [
      { keys: "Ctrl/⌘ K", label: "Open task center" },
      { keys: "Ctrl/⌘ E", label: "Toggle Basic / Expert view" },
      { keys: "Ctrl/⌘ 1–5", label: "Switch Studio step" },
    ],
    manualPath: "",
  },
  aligner: {
    eyebrow: "LiSCA Aligner · Basics",
    title: "Standalone grid registration",
    subtitle:
      "Open a workspace and microscopy source to fit micropattern lattices and curate ROI selections.",
    steps: [
      {
        number: "01",
        title: "Pick Workspace & Source",
        body: "Choose a workspace folder (existing assay.json sources load automatically) or attach an ND2, CZI, or image folder.",
      },
      {
        number: "02",
        title: "Fit lattice & track drift",
        body: "Auto-detect the grid, refine geometry with Pan / Rotate / Spacing / Size, and pin drift keyframes if stage motion occurs.",
      },
      {
        number: "03",
        title: "Exclude & Save positions",
        body: "Run Edge or Log-std exclude, then Save (Ctrl/⌘+S) to write Pos*/bbox.csv and align.json for cropping.",
      },
    ],
    shortcuts: [
      { keys: "← / → or [ / ]", label: "Previous / next time frame" },
      { keys: "1–4", label: "Pan, Rotate, Spacing, Size" },
      { keys: "Ctrl/⌘ ←/→", label: "Previous / next position" },
      { keys: "Ctrl/⌘ S", label: "Save current position" },
    ],
    manualPath: "",
  },
  annotator: {
    eyebrow: "LiSCA Annotator · Basics",
    title: "Standalone ROI annotation",
    subtitle:
      "Open any cropped workspace to classify single-cell phenotypes, segment masks, or run label-free inference.",
    steps: [
      {
        number: "01",
        title: "Open a cropped workspace",
        body: "Pick a workspace containing Pos*/crops/*.tif stacks. Annotator scans all positions, ROIs, channels, and frames.",
      },
      {
        number: "02",
        title: "Classify or Smart-segment cells",
        body: "Assign frame-level classes (Shift+1..9) or segment masks with Brush (1), Lasso (2), and Smart SlimSAM clicks (3).",
      },
      {
        number: "03",
        title: "Save or scale with Label-free",
        body: "Save annotations (Ctrl/⌘+S) or build an embedding reference set in the Label-free panel to classify all ROIs.",
      },
    ],
    shortcuts: [
      { keys: "← / → or [ / ]", label: "Previous / next time frame" },
      { keys: "1–5", label: "Brush, Lasso, Smart, Erase, Zoom" },
      { keys: "Shift 1–9", label: "Select or toggle label" },
      { keys: "Ctrl/⌘ ←/→", label: "Previous / next ROI" },
    ],
    manualPath: "",
  },
};

const HelpDialogMessage = UiSchema.TaggedEnum({
  Opened: {},
  Closed: {},
});

export const ShellHelpDialog = Html.component({
  name: "ShellHelpDialog",
  props: Schema.Struct({
    topic: QuickGuideTopicIdSchema,
    class: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({
    open: Schema.Boolean,
  }),
  message: HelpDialogMessage,
}).make({
  init: () => ({ open: false }),
  update: {
    Opened: ($) => $.evolve({ open: true }),
    Closed: ($) => $.evolve({ open: false }),
  },
  view: (h, model) => {
    const topic = QUICK_GUIDE_TOPICS[h.props.topic];
    const manualUrl = `${MANUAL_BASE_URL}${topic.manualPath}`;

    return h.span.class("inline-flex").children(
      Button(h, {
        ariaLabel: "Quick guide",
        class: cn("size-7", h.props.class),
        size: "icon",
        title: "Quick guide",
        type: "button",
        variant: "outline",
        onPress: HelpDialogMessage.Opened(),
      }).children(Icon(h, "info", { class: "size-4" })),
      model.open
        ? ModalScrim(h, {
            maxWidth: "lg",
            surfaceClass: "gap-0 overflow-hidden p-0",
            ariaLabelledby: "lisca-quick-guide-title",
            onDismiss: () => HelpDialogMessage.Closed(),
            children: [
              h.div
                .class("flex items-start justify-between gap-4 border-b border-border px-5 py-4")
                .children(
                  h.div
                    .class("space-y-1")
                    .children(
                      h.p
                        .class(
                          "font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground",
                        )
                        .children(topic.eyebrow),
                      h.h2
                        .attr("id", "lisca-quick-guide-title")
                        .class("text-lg font-semibold text-foreground")
                        .children(topic.title),
                      h.p.class("text-sm text-muted-foreground").children(topic.subtitle),
                    ),
                  Button(h, {
                    ariaLabel: "Close quick guide",
                    size: "icon-sm",
                    type: "button",
                    variant: "ghost",
                    onPress: HelpDialogMessage.Closed(),
                  }).children(Icon(h, "x")),
                ),
              h.div.class("flex flex-col gap-5 p-5").children(
                h.ol.class("flex flex-col gap-3").children(
                  ...topic.steps.map((step) =>
                    h.li
                      .key(step.number)
                      .class(
                        "grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 border border-border bg-muted/20 p-3",
                      )
                      .children(
                        h.span
                          .class("font-mono text-xs font-semibold text-muted-foreground")
                          .children(step.number),
                        h.div
                          .class("space-y-1")
                          .children(
                            h.p.class("text-sm font-medium text-foreground").children(step.title),
                            h.p
                              .class("text-xs leading-relaxed text-muted-foreground")
                              .children(step.body),
                          ),
                      ),
                  ),
                ),
                h.div
                  .class("space-y-2")
                  .children(
                    h.p
                      .class(
                        "font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
                      )
                      .children("Keyboard shortcuts"),
                    h.div
                      .class("grid grid-cols-1 gap-2 sm:grid-cols-2")
                      .children(
                        ...topic.shortcuts.map((shortcut) =>
                          h.div
                            .key(shortcut.keys)
                            .class(
                              "flex items-center justify-between gap-2 border border-border px-2.5 py-1.5 text-xs",
                            )
                            .children(
                              h.span
                                .class("truncate text-muted-foreground")
                                .children(shortcut.label),
                              h.kbd
                                .class(
                                  "shrink-0 bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground",
                                )
                                .children(shortcut.keys),
                            ),
                        ),
                      ),
                  ),
              ),
              h.div
                .class(
                  "flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3",
                )
                .children(
                  h.a
                    .class(
                      "inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline-offset-4 hover:underline",
                    )
                    .attr("href", manualUrl)
                    .attr("rel", "noreferrer")
                    .attr("target", "_blank")
                    .children(
                      h.span.children("Open full manual"),
                      Icon(h, "arrow-square-out", { class: "size-3.5" }),
                    ),
                  Button(h, {
                    size: "sm",
                    type: "button",
                    variant: "outline",
                    onPress: HelpDialogMessage.Closed(),
                  }).children("Done"),
                ),
            ],
          })
        : undefined,
    );
  },
});
