import type { View } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import { Badge } from "@lisca/ui/primitives";

import type { ResearchAreaId } from "../state/studio-onboarding";

function FigureFrame<M, R = never>(
  h: Html.H<M>,
  options: {
    readonly eyebrow: string;
    readonly title: string;
    readonly caption: string;
    readonly legend: View.Input<M, R>;
    readonly children: View.Input<M, R>;
  },
) {
  return h.figure
    .class("flex min-w-0 flex-col justify-between gap-3 border border-border bg-background p-4")
    .children(
      h.div
        .class("flex flex-col gap-1.5")
        .children(
          h.div
            .class("flex items-center justify-between gap-2")
            .children(
              h.span
                .class(
                  "text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground",
                )
                .children(options.eyebrow),
              Badge(h, { variant: "secondary" }).children("Sample figure"),
            ),
          h.figcaption
            .class("text-sm font-semibold leading-5 text-foreground")
            .children(options.title),
        ),
      h.div.class("w-full border border-border bg-muted/20 p-2").children(options.children),
      h.div
        .class("flex flex-col gap-1.5")
        .children(
          h.div
            .class(
              "flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] leading-4 text-muted-foreground",
            )
            .children(options.legend),
          h.p.class("text-xs leading-4 text-muted-foreground").children(options.caption),
        ),
    );
}

function LegendSwatch<M>(
  h: Html.H<M>,
  options: {
    readonly label: string;
    readonly color?: string | undefined;
    readonly dashed?: boolean | undefined;
    readonly band?: boolean | undefined;
  },
) {
  return h.span.class("inline-flex items-center gap-1.5").children(
    options.band
      ? h.span
          .attr("aria-hidden", "true")
          .class("inline-block h-2.5 w-3.5 border border-foreground/30 bg-foreground/15")
      : h.span
          .attr("aria-hidden", "true")
          .class("inline-block h-0.5 w-3.5")
          .style({
            backgroundColor: options.dashed
              ? "transparent"
              : (options.color ?? "var(--foreground)"),
            ...(options.dashed
              ? { borderTop: `1.5px dashed ${options.color ?? "var(--muted-foreground)"}` }
              : {}),
          }),
    h.span.children(options.label),
  );
}

function svgGridLines<M>(h: Html.H<M>) {
  return [
    h.el("line").attrs({
      stroke: "var(--border)",
      "stroke-width": "1",
      x1: "42",
      x2: "324",
      y1: "24",
      y2: "24",
    }),
    h.el("line").attrs({
      stroke: "var(--border)",
      "stroke-width": "1",
      x1: "42",
      x2: "324",
      y1: "66",
      y2: "66",
    }),
    h.el("line").attrs({
      stroke: "var(--border)",
      "stroke-width": "1",
      x1: "42",
      x2: "324",
      y1: "108",
      y2: "108",
    }),
    h.el("line").attrs({
      stroke: "var(--border)",
      "stroke-width": "1",
      x1: "42",
      x2: "324",
      y1: "150",
      y2: "150",
    }),
    h.el("line").attrs({
      stroke: "var(--border)",
      "stroke-width": "1",
      x1: "42",
      x2: "42",
      y1: "18",
      y2: "150",
    }),
  ];
}

function svgText<M>(h: Html.H<M>, attrs: Record<string, string>, text: string) {
  return h.el("text").attrs(attrs).children(text);
}

function svgYAxis<M>(
  h: Html.H<M>,
  ticks: readonly [string, string, string, string],
  label: string,
) {
  const ys = ["27", "69", "111", "153"] as const;
  return [
    ...ticks.map((tick, i) =>
      svgText(
        h,
        {
          fill: "var(--muted-foreground)",
          "font-size": "9",
          "text-anchor": "end",
          x: "36",
          y: ys[i]!,
        },
        tick,
      ),
    ),
    svgText(
      h,
      {
        fill: "var(--muted-foreground)",
        "font-size": "9",
        "text-anchor": "middle",
        transform: "rotate(-90 12 86)",
        x: "12",
        y: "86",
      },
      label,
    ),
  ];
}

function svgXAxis<M>(h: Html.H<M>, ticks: readonly (readonly [string, string])[], label: string) {
  return [
    ...ticks.map(([x, text]) =>
      svgText(
        h,
        { fill: "var(--muted-foreground)", "font-size": "9", "text-anchor": "middle", x, y: "164" },
        text,
      ),
    ),
    svgText(
      h,
      {
        fill: "var(--muted-foreground)",
        "font-size": "9",
        "text-anchor": "middle",
        x: "183",
        y: "179",
      },
      label,
    ),
  ];
}

function LnpBindingFigures<M>(h: Html.H<M>) {
  return h.div.class("grid grid-cols-1 gap-4 md:grid-cols-2").children(
    FigureFrame(h, {
      caption:
        "Cumulative Picasso Spot localizations per micropattern ROI across 3 h (median line with 25th–75th percentile IQR band).",
      eyebrow: "LNP binding · binding_traces_summary.png",
      legend: [
        LegendSwatch(h, { label: "Targeted LNP (median)" }),
        LegendSwatch(h, { band: true, label: "IQR (n = 64 ROIs)" }),
        LegendSwatch(h, { dashed: true, label: "Untargeted LNP" }),
      ],
      title: "Cumulative Spot count per ROI",
      children: h
        .el("svg")
        .attrs({
          "aria-label":
            "Sample LNP binding plot showing cumulative spots per ROI over 180 minutes for Targeted LNP versus Untargeted LNP",
          class: "h-auto w-full select-none",
          role: "img",
          viewBox: "0 0 340 185",
        })
        .children(
          ...svgGridLines(h),
          ...svgYAxis(h, ["30", "20", "10", "0"], "Spots / ROI"),
          ...svgXAxis(
            h,
            [
              ["42", "0"],
              ["136", "60"],
              ["230", "120"],
              ["324", "180"],
            ],
            "Timepoint (min)",
          ),
          h.el("polygon").attrs({
            fill: "var(--foreground)",
            "fill-opacity": "0.12",
            points:
              "42,148 89,102 136,68 183,49 230,38 277,33 324,30 324,62 277,66 230,72 183,84 136,102 89,126 42,150",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,149 89,114 136,85 183,66 230,55 277,49 324,46",
            stroke: "var(--foreground)",
            "stroke-width": "2",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,149 89,141 136,134 183,130 230,127 277,126 324,125",
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "4 3",
            "stroke-width": "1.75",
          }),
          h
            .el("g")
            .attrs({ transform: "translate(258, 76)" })
            .children(
              h.el("rect").attrs({
                fill: "var(--background)",
                height: "44",
                stroke: "var(--border)",
                "stroke-width": "1",
                width: "56",
                x: "0",
                y: "0",
              }),
              h.el("rect").attrs({
                fill: "none",
                height: "30",
                stroke: "var(--muted-foreground)",
                "stroke-dasharray": "2 2",
                "stroke-width": "0.9",
                width: "30",
                x: "13",
                y: "7",
              }),
              h.el("circle").attrs({ cx: "22", cy: "16", fill: "var(--foreground)", r: "2" }),
              h.el("circle").attrs({ cx: "31", cy: "14", fill: "var(--foreground)", r: "1.8" }),
              h.el("circle").attrs({ cx: "27", cy: "24", fill: "var(--foreground)", r: "2.2" }),
              h.el("circle").attrs({ cx: "36", cy: "28", fill: "var(--foreground)", r: "1.7" }),
              h.el("circle").attrs({ cx: "19", cy: "29", fill: "var(--foreground)", r: "1.9" }),
            ),
        ),
    }),
    FigureFrame(h, {
      caption:
        "Downstream reporter fluorescence F_corr after non-cell median background subtraction, fitted with Müller et al. (2024) Eq. 3.",
      eyebrow: "Transfection · traces_fit.png",
      legend: [
        LegendSwatch(h, { color: "var(--instrument-gfp)", label: "GFP cell Traces" }),
        LegendSwatch(h, { dashed: true, label: "Model fit F(t)" }),
      ],
      title: "Downstream reporter onset & kinetic fit",
      children: h
        .el("svg")
        .attrs({
          "aria-label":
            "Sample transfection plot showing background-corrected GFP fluorescence traces and kinetic model fit with onset time t0",
          class: "h-auto w-full select-none",
          role: "img",
          viewBox: "0 0 340 185",
        })
        .children(
          ...svgGridLines(h),
          ...svgYAxis(h, ["12k", "8k", "4k", "0"], "F_corr (a.u.)"),
          ...svgXAxis(
            h,
            [
              ["42", "0"],
              ["112", "4"],
              ["183", "8"],
              ["253", "12"],
              ["324", "16"],
            ],
            "Timepoint (h)",
          ),
          h.el("line").attrs({
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "2 2",
            "stroke-width": "1",
            x1: "68",
            x2: "68",
            y1: "24",
            y2: "150",
          }),
          svgText(
            h,
            { fill: "var(--foreground)", "font-size": "9", "font-weight": "600", x: "72", y: "34" },
            "t0 = 42 min",
          ),
          h.el("polyline").attrs({
            fill: "none",
            opacity: "0.45",
            points: "42,148 76,147 104,114 140,78 183,68 235,79 285,95 324,109",
            stroke: "var(--instrument-gfp)",
            "stroke-width": "1.3",
          }),
          h.el("polyline").attrs({
            fill: "none",
            opacity: "0.45",
            points: "42,149 85,148 118,125 156,99 198,92 245,101 292,114 324,123",
            stroke: "var(--instrument-gfp)",
            "stroke-width": "1.3",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,148 68,148 94,102 126,56 164,38 208,44 262,61 324,82",
            stroke: "var(--instrument-gfp)",
            "stroke-width": "2.1",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,148 68,148 94,104 126,58 164,40 208,45 262,62 324,83",
            stroke: "var(--foreground)",
            "stroke-dasharray": "4 3",
            "stroke-width": "1.5",
          }),
        ),
    }),
  );
}

function PharmacologyFigures<M>(h: Html.H<M>) {
  return h.div.class("grid grid-cols-1 gap-4 md:grid-cols-2").children(
    FigureFrame(h, {
      caption:
        "Multi-Sample survival curves computed directly from death-reporter step transitions across cropped micropattern ROIs.",
      eyebrow: "Death reporter · survival_curve.png",
      legend: [
        LegendSwatch(h, { dashed: true, label: "Vehicle" }),
        LegendSwatch(h, { color: "var(--muted-foreground)", label: "0.2 µM Compound" }),
        LegendSwatch(h, { label: "2.0 µM Compound" }),
      ],
      title: "Sample survival (% viable)",
      children: h
        .el("svg")
        .attrs({
          "aria-label":
            "Sample pharmacology survival curve comparing Vehicle, 0.2 micromolar Compound, and 2.0 micromolar Compound over 24 hours",
          class: "h-auto w-full select-none",
          role: "img",
          viewBox: "0 0 340 185",
        })
        .children(
          ...svgGridLines(h),
          ...svgYAxis(h, ["100%", "67%", "33%", "0%"], "Viable cells"),
          ...svgXAxis(
            h,
            [
              ["42", "0"],
              ["112", "6"],
              ["183", "12"],
              ["253", "18"],
              ["324", "24"],
            ],
            "Timepoint (h)",
          ),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,24 148,24 148,27 255,27 255,29 324,29",
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "4 3",
            "stroke-width": "1.5",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points:
              "42,24 88,24 88,34 126,34 126,52 168,52 168,72 206,72 206,89 262,89 262,92 324,92",
            stroke: "var(--muted-foreground)",
            "stroke-width": "1.8",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points:
              "42,24 68,24 68,42 92,42 92,69 118,69 118,98 150,98 150,122 196,122 196,136 324,136",
            stroke: "var(--foreground)",
            "stroke-width": "2.1",
          }),
        ),
    }),
    FigureFrame(h, {
      caption:
        "Single-ROI propidium iodide uptake Trace with 10th-percentile background subtraction and sustained step call at t_death.",
      eyebrow: "Single-ROI call · viability.csv",
      legend: [
        LegendSwatch(h, { label: "PI signal F_corr" }),
        LegendSwatch(h, { dashed: true, label: "Two-regime step fit" }),
      ],
      title: "Single-cell death-reporter step transition",
      children: h
        .el("svg")
        .attrs({
          "aria-label":
            "Sample single-cell propidium iodide fluorescence trace with detected step transition at t_death equals 6.5 hours",
          class: "h-auto w-full select-none",
          role: "img",
          viewBox: "0 0 340 185",
        })
        .children(
          ...svgGridLines(h),
          ...svgYAxis(h, ["900", "600", "300", "0"], "PI F_corr (a.u.)"),
          ...svgXAxis(
            h,
            [
              ["42", "0"],
              ["112", "6"],
              ["183", "12"],
              ["253", "18"],
              ["324", "24"],
            ],
            "Timepoint (h)",
          ),
          h.el("line").attrs({
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "2 2",
            "stroke-width": "1",
            x1: "118",
            x2: "118",
            y1: "24",
            y2: "150",
          }),
          svgText(
            h,
            {
              fill: "var(--foreground)",
              "font-size": "9",
              "font-weight": "600",
              x: "123",
              y: "34",
            },
            "t_death = 6.5 h",
          ),
          h.el("polyline").attrs({
            fill: "none",
            points:
              "42,146 62,144 82,147 102,145 114,143 122,58 138,44 166,46 202,42 248,45 288,43 324,44",
            stroke: "var(--foreground)",
            "stroke-width": "2",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,145 118,145 118,44 324,44",
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "4 3",
            "stroke-width": "1.5",
          }),
        ),
    }),
  );
}

function CancerImmunologyFigures<M>(h: Html.H<M>) {
  return h.div.class("grid grid-cols-1 gap-4 md:grid-cols-2").children(
    FigureFrame(h, {
      caption:
        "Mean T cells touching the Otsu tumor Mask per ROI across Frames (watershed-split T-cell localizations, D = 10 px).",
      eyebrow: "Engagement · engagement_traces_summary.png",
      legend: [
        LegendSwatch(h, { label: "CAR-T 1:4 (mean)" }),
        LegendSwatch(h, { band: true, label: "IQR" }),
        LegendSwatch(h, { dashed: true, label: "Untransduced T 1:4" }),
      ],
      title: "Mean T-cell engagements per tumor ROI",
      children: h
        .el("svg")
        .attrs({
          "aria-label":
            "Sample T-cell engagement plot showing mean engagements per tumor ROI over 12 hours for CAR-T 1:4 versus Untransduced T 1:4",
          class: "h-auto w-full select-none",
          role: "img",
          viewBox: "0 0 340 185",
        })
        .children(
          ...svgGridLines(h),
          ...svgYAxis(h, ["3.0", "2.0", "1.0", "0.0"], "Engagements / ROI"),
          ...svgXAxis(
            h,
            [
              ["42", "0"],
              ["112", "3"],
              ["183", "6"],
              ["253", "9"],
              ["324", "12"],
            ],
            "Timepoint (h)",
          ),
          h.el("polygon").attrs({
            fill: "var(--foreground)",
            "fill-opacity": "0.12",
            points:
              "42,140 88,78 136,42 183,48 230,62 277,74 324,84 324,114 277,106 230,96 183,84 136,78 88,108 42,148",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,144 88,93 136,60 183,66 230,79 277,90 324,99",
            stroke: "var(--foreground)",
            "stroke-width": "2",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,146 88,139 136,136 183,138 230,137 277,140 324,141",
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "4 3",
            "stroke-width": "1.6",
          }),
        ),
    }),
    FigureFrame(h, {
      caption:
        "Companion death-reporter workflow on the same Sample layout tracks target-cell loss following effector engagement.",
      eyebrow: "Death reporter · survival_curve.png",
      legend: [
        LegendSwatch(h, { dashed: true, label: "Tumor only" }),
        LegendSwatch(h, { color: "var(--muted-foreground)", label: "Untransduced T 1:4" }),
        LegendSwatch(h, { label: "CAR-T 1:4" }),
      ],
      title: "Companion target-cell survival",
      children: h
        .el("svg")
        .attrs({
          "aria-label":
            "Sample target-cell survival plot comparing Tumor only, Untransduced T 1:4, and CAR-T 1:4 over 12 hours",
          class: "h-auto w-full select-none",
          role: "img",
          viewBox: "0 0 340 185",
        })
        .children(
          ...svgGridLines(h),
          ...svgYAxis(h, ["100%", "67%", "33%", "0%"], "Viable target cells"),
          ...svgXAxis(
            h,
            [
              ["42", "0"],
              ["112", "3"],
              ["183", "6"],
              ["253", "9"],
              ["324", "12"],
            ],
            "Timepoint (h)",
          ),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,24 196,24 196,27 324,27",
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "4 3",
            "stroke-width": "1.5",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,24 136,24 136,31 230,31 230,37 324,37",
            stroke: "var(--muted-foreground)",
            "stroke-width": "1.7",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points:
              "42,24 82,24 82,38 118,38 118,64 162,64 162,96 212,96 212,118 268,118 268,128 324,128",
            stroke: "var(--foreground)",
            "stroke-width": "2.1",
          }),
        ),
    }),
  );
}

function ExpressionKineticsFigures<M>(h: Html.H<M>) {
  return h.div.class("grid grid-cols-1 gap-4 md:grid-cols-2").children(
    FigureFrame(h, {
      caption:
        "Individual micropatterned cells exhibit distinct Onset times (t0), peak amplitudes, and mRNA decay slopes around a shared Protein lifetime.",
      eyebrow: "Single-cell traces · traces.png",
      legend: [
        LegendSwatch(h, { color: "var(--instrument-gfp)", label: "Individual ROI GFP Traces" }),
        LegendSwatch(h, { dashed: true, label: "Sample median" }),
      ],
      title: "Cell-to-cell heterogeneity on micropatterns",
      children: h
        .el("svg")
        .attrs({
          "aria-label":
            "Sample single-cell expression plot showing four heterogeneous GFP traces and Sample median over 20 hours",
          class: "h-auto w-full select-none",
          role: "img",
          viewBox: "0 0 340 185",
        })
        .children(
          ...svgGridLines(h),
          ...svgYAxis(h, ["15k", "10k", "5k", "0"], "F_corr (a.u.)"),
          ...svgXAxis(
            h,
            [
              ["42", "0"],
              ["98", "4"],
              ["155", "8"],
              ["211", "12"],
              ["268", "16"],
              ["324", "20"],
            ],
            "Timepoint (h)",
          ),
          h.el("polyline").attrs({
            fill: "none",
            opacity: "0.85",
            points: "42,148 56,148 82,84 114,32 155,28 211,46 268,69 324,90",
            stroke: "var(--instrument-gfp)",
            "stroke-width": "1.6",
          }),
          h.el("polyline").attrs({
            fill: "none",
            opacity: "0.7",
            points: "42,149 68,148 96,104 132,62 174,56 226,71 278,92 324,108",
            stroke: "var(--instrument-gfp)",
            "stroke-width": "1.5",
          }),
          h.el("polyline").attrs({
            fill: "none",
            opacity: "0.55",
            points: "42,149 84,148 116,118 152,88 196,86 248,100 292,115 324,125",
            stroke: "var(--instrument-gfp)",
            "stroke-width": "1.4",
          }),
          h.el("polyline").attrs({
            fill: "none",
            opacity: "0.45",
            points: "42,149 62,148 88,128 118,112 155,118 211,130 268,139 324,144",
            stroke: "var(--instrument-gfp)",
            "stroke-width": "1.3",
          }),
          h.el("polyline").attrs({
            fill: "none",
            points: "42,149 70,148 100,111 136,76 178,72 230,86 280,104 324,117",
            stroke: "var(--foreground)",
            "stroke-dasharray": "4 3",
            "stroke-width": "1.8",
          }),
        ),
    }),
    FigureFrame(h, {
      caption:
        "Workspace parameter plots compare fitted Expression rate (m0·k_TL) and apparent mRNA half-life (τ_mRNA) across Samples.",
      eyebrow: "Parameter comparison · expression_rate.png",
      legend: [
        LegendSwatch(h, { label: "Median & IQR box" }),
        LegendSwatch(h, { dashed: true, label: "1.5× IQR whiskers" }),
      ],
      title: "Fitted kinetic parameter distributions",
      children: h
        .el("svg")
        .attrs({
          "aria-label":
            "Sample boxplot comparing fitted expression rate and mRNA half-life between N1-methylpseudouridine mRNA and Unmodified mRNA Samples",
          class: "h-auto w-full select-none",
          role: "img",
          viewBox: "0 0 340 185",
        })
        .children(
          ...svgGridLines(h),
          ...svgYAxis(h, ["30", "20", "10", "0"], "m0·k_TL (a.u./min)"),
          // Boxplot 1: N1-psi mRNA
          h.el("line").attrs({
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "3 2",
            "stroke-width": "1.2",
            x1: "122",
            x2: "122",
            y1: "32",
            y2: "112",
          }),
          h.el("line").attrs({
            stroke: "var(--foreground)",
            "stroke-width": "1.2",
            x1: "108",
            x2: "136",
            y1: "32",
            y2: "32",
          }),
          h.el("line").attrs({
            stroke: "var(--foreground)",
            "stroke-width": "1.2",
            x1: "108",
            x2: "136",
            y1: "112",
            y2: "112",
          }),
          h.el("rect").attrs({
            fill: "var(--background)",
            height: "42",
            stroke: "var(--foreground)",
            "stroke-width": "1.5",
            width: "48",
            x: "98",
            y: "50",
          }),
          h.el("line").attrs({
            stroke: "var(--foreground)",
            "stroke-width": "2.2",
            x1: "98",
            x2: "146",
            y1: "70",
            y2: "70",
          }),
          svgText(
            h,
            {
              fill: "var(--foreground)",
              "font-size": "9",
              "font-weight": "500",
              "text-anchor": "middle",
              x: "122",
              y: "166",
            },
            "N1Ψ mRNA",
          ),
          svgText(
            h,
            {
              fill: "var(--muted-foreground)",
              "font-size": "8.5",
              "text-anchor": "middle",
              x: "122",
              y: "178",
            },
            "τ_mRNA = 4.8 h",
          ),
          // Boxplot 2: Unmodified mRNA
          h.el("line").attrs({
            stroke: "var(--muted-foreground)",
            "stroke-dasharray": "3 2",
            "stroke-width": "1.2",
            x1: "242",
            x2: "242",
            y1: "78",
            y2: "138",
          }),
          h.el("line").attrs({
            stroke: "var(--foreground)",
            "stroke-width": "1.2",
            x1: "228",
            x2: "256",
            y1: "78",
            y2: "78",
          }),
          h.el("line").attrs({
            stroke: "var(--foreground)",
            "stroke-width": "1.2",
            x1: "228",
            x2: "256",
            y1: "138",
            y2: "138",
          }),
          h.el("rect").attrs({
            fill: "var(--background)",
            height: "32",
            stroke: "var(--foreground)",
            "stroke-width": "1.5",
            width: "48",
            x: "218",
            y: "96",
          }),
          h.el("line").attrs({
            stroke: "var(--foreground)",
            "stroke-width": "2.2",
            x1: "218",
            x2: "266",
            y1: "114",
            y2: "114",
          }),
          svgText(
            h,
            {
              fill: "var(--foreground)",
              "font-size": "9",
              "font-weight": "500",
              "text-anchor": "middle",
              x: "242",
              y: "166",
            },
            "Unmodified mRNA",
          ),
          svgText(
            h,
            {
              fill: "var(--muted-foreground)",
              "font-size": "8.5",
              "text-anchor": "middle",
              x: "242",
              y: "178",
            },
            "τ_mRNA = 2.8 h",
          ),
        ),
    }),
  );
}

export function StudioResearchFigures<M>(
  h: Html.H<M>,
  options: { readonly areaId: ResearchAreaId },
) {
  switch (options.areaId) {
    case "lnp-delivery":
      return LnpBindingFigures(h);
    case "pharmacology":
      return PharmacologyFigures(h);
    case "cancer-immunology":
      return CancerImmunologyFigures(h);
    case "expression-kinetics":
      return ExpressionKineticsFigures(h);
  }
}
