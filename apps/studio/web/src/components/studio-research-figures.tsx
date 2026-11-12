import { Badge } from "@lisca/ui/primitives";
import type { JSX } from "solid-js";
import { Match, Switch } from "solid-js";

import type { ResearchAreaId } from "../state/studio-onboarding";

function FigureFrame(props: {
  eyebrow: string;
  title: string;
  caption: string;
  legend: JSX.Element;
  children: JSX.Element;
}) {
  return (
    <figure class="flex min-w-0 flex-col justify-between gap-3 border border-border bg-background p-4">
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
            {props.eyebrow}
          </span>
          <Badge variant="secondary">Sample figure</Badge>
        </div>
        <figcaption class="text-sm font-semibold leading-5 text-foreground">
          {props.title}
        </figcaption>
      </div>
      <div class="w-full border border-border bg-muted/20 p-2">{props.children}</div>
      <div class="flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] leading-4 text-muted-foreground">
          {props.legend}
        </div>
        <p class="text-xs leading-4 text-muted-foreground">{props.caption}</p>
      </div>
    </figure>
  );
}

function LegendSwatch(props: { label: string; color?: string; dashed?: boolean; band?: boolean }) {
  return (
    <span class="inline-flex items-center gap-1.5">
      {props.band ? (
        <span
          aria-hidden="true"
          class="inline-block h-2.5 w-3.5 border border-foreground/30 bg-foreground/15"
        />
      ) : (
        <span
          aria-hidden="true"
          class="inline-block h-0.5 w-3.5"
          style={{
            "background-color": props.dashed ? "transparent" : (props.color ?? "var(--foreground)"),
            "border-top": props.dashed
              ? `1.5px dashed ${props.color ?? "var(--muted-foreground)"}`
              : undefined,
          }}
        />
      )}
      <span>{props.label}</span>
    </span>
  );
}

function LnpBindingFigures() {
  return (
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FigureFrame
        caption="Cumulative Picasso Spot localizations per micropattern ROI across 3 h (median line with 25th–75th percentile IQR band)."
        eyebrow="LNP binding · binding_traces_summary.png"
        legend={
          <>
            <LegendSwatch label="Targeted LNP (median)" />
            <LegendSwatch band label="IQR (n = 64 ROIs)" />
            <LegendSwatch dashed label="Untargeted LNP" />
          </>
        }
        title="Cumulative Spot count per ROI"
      >
        <svg
          aria-label="Sample LNP binding plot showing cumulative spots per ROI over 180 minutes for Targeted LNP versus Untargeted LNP"
          class="h-auto w-full select-none"
          role="img"
          viewBox="0 0 340 185"
        >
          {/* Grid lines */}
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="24" y2="24" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="66" y2="66" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="108" y2="108" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="150" y2="150" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="42" y1="18" y2="150" />

          {/* Y axis ticks */}
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="27">
            30
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="69">
            20
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="111">
            10
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="153">
            0
          </text>
          <text
            fill="var(--muted-foreground)"
            font-size="9"
            text-anchor="middle"
            transform="rotate(-90 12 86)"
            x="12"
            y="86"
          >
            Spots / ROI
          </text>

          {/* X axis ticks */}
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="42" y="164">
            0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="136" y="164">
            60
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="230" y="164">
            120
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="324" y="164">
            180
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="179">
            Timepoint (min)
          </text>

          {/* Targeted LNP IQR band */}
          <polygon
            fill="var(--foreground)"
            fill-opacity="0.12"
            points="42,148 89,102 136,68 183,49 230,38 277,33 324,30 324,62 277,66 230,72 183,84 136,102 89,126 42,150"
          />
          {/* Targeted LNP median */}
          <polyline
            fill="none"
            points="42,149 89,114 136,85 183,66 230,55 277,49 324,46"
            stroke="var(--foreground)"
            stroke-width="2"
          />

          {/* Untargeted LNP median */}
          <polyline
            fill="none"
            points="42,149 89,141 136,134 183,130 230,127 277,126 324,125"
            stroke="var(--muted-foreground)"
            stroke-dasharray="4 3"
            stroke-width="1.75"
          />

          {/* Mini ROI spot inset */}
          <g transform="translate(258, 76)">
            <rect
              fill="var(--background)"
              height="44"
              stroke="var(--border)"
              stroke-width="1"
              width="56"
              x="0"
              y="0"
            />
            <rect
              fill="none"
              height="30"
              stroke="var(--muted-foreground)"
              stroke-dasharray="2 2"
              stroke-width="0.9"
              width="30"
              x="13"
              y="7"
            />
            <circle cx="22" cy="16" fill="var(--foreground)" r="2" />
            <circle cx="31" cy="14" fill="var(--foreground)" r="1.8" />
            <circle cx="27" cy="24" fill="var(--foreground)" r="2.2" />
            <circle cx="36" cy="28" fill="var(--foreground)" r="1.7" />
            <circle cx="19" cy="29" fill="var(--foreground)" r="1.9" />
          </g>
        </svg>
      </FigureFrame>

      <FigureFrame
        caption="Downstream reporter fluorescence F_corr after non-cell median background subtraction, fitted with Müller et al. (2024) Eq. 3."
        eyebrow="Transfection · traces_fit.png"
        legend={
          <>
            <LegendSwatch color="var(--instrument-gfp)" label="GFP cell Traces" />
            <LegendSwatch dashed label="Model fit F(t)" />
          </>
        }
        title="Downstream reporter onset & kinetic fit"
      >
        <svg
          aria-label="Sample transfection plot showing background-corrected GFP fluorescence traces and kinetic model fit with onset time t0"
          class="h-auto w-full select-none"
          role="img"
          viewBox="0 0 340 185"
        >
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="24" y2="24" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="66" y2="66" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="108" y2="108" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="150" y2="150" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="42" y1="18" y2="150" />

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="27">
            12k
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="69">
            8k
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="111">
            4k
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="153">
            0
          </text>
          <text
            fill="var(--muted-foreground)"
            font-size="9"
            text-anchor="middle"
            transform="rotate(-90 12 86)"
            x="12"
            y="86"
          >
            F_corr (a.u.)
          </text>

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="42" y="164">
            0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="112" y="164">
            4
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="164">
            8
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="253" y="164">
            12
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="324" y="164">
            16
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="179">
            Timepoint (h)
          </text>

          {/* Onset t0 marker */}
          <line
            stroke="var(--muted-foreground)"
            stroke-dasharray="2 2"
            stroke-width="1"
            x1="68"
            x2="68"
            y1="24"
            y2="150"
          />
          <text fill="var(--foreground)" font-size="9" font-weight="600" x="72" y="34">
            t0 = 42 min
          </text>

          {/* Secondary single-cell GFP traces */}
          <polyline
            fill="none"
            opacity="0.45"
            points="42,148 76,147 104,114 140,78 183,68 235,79 285,95 324,109"
            stroke="var(--instrument-gfp)"
            stroke-width="1.3"
          />
          <polyline
            fill="none"
            opacity="0.45"
            points="42,149 85,148 118,125 156,99 198,92 245,101 292,114 324,123"
            stroke="var(--instrument-gfp)"
            stroke-width="1.3"
          />
          {/* Highlighted cell GFP trace */}
          <polyline
            fill="none"
            points="42,148 68,148 94,102 126,56 164,38 208,44 262,61 324,82"
            stroke="var(--instrument-gfp)"
            stroke-width="2.1"
          />
          {/* Fitted translation-degradation curve */}
          <polyline
            fill="none"
            points="42,148 68,148 94,104 126,58 164,40 208,45 262,62 324,83"
            stroke="var(--foreground)"
            stroke-dasharray="4 3"
            stroke-width="1.5"
          />
        </svg>
      </FigureFrame>
    </div>
  );
}

function PharmacologyFigures() {
  return (
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FigureFrame
        caption="Multi-Sample survival curves computed directly from death-reporter step transitions across cropped micropattern ROIs."
        eyebrow="Death reporter · survival_curve.png"
        legend={
          <>
            <LegendSwatch dashed label="Vehicle" />
            <LegendSwatch color="var(--muted-foreground)" label="0.2 µM Compound" />
            <LegendSwatch label="2.0 µM Compound" />
          </>
        }
        title="Sample survival (% viable)"
      >
        <svg
          aria-label="Sample pharmacology survival curve comparing Vehicle, 0.2 micromolar Compound, and 2.0 micromolar Compound over 24 hours"
          class="h-auto w-full select-none"
          role="img"
          viewBox="0 0 340 185"
        >
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="24" y2="24" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="66" y2="66" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="108" y2="108" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="150" y2="150" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="42" y1="18" y2="150" />

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="27">
            100%
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="69">
            67%
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="111">
            33%
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="153">
            0%
          </text>
          <text
            fill="var(--muted-foreground)"
            font-size="9"
            text-anchor="middle"
            transform="rotate(-90 12 86)"
            x="12"
            y="86"
          >
            Viable cells
          </text>

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="42" y="164">
            0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="112" y="164">
            6
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="164">
            12
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="253" y="164">
            18
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="324" y="164">
            24
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="179">
            Timepoint (h)
          </text>

          {/* Vehicle */}
          <polyline
            fill="none"
            points="42,24 148,24 148,27 255,27 255,29 324,29"
            stroke="var(--muted-foreground)"
            stroke-dasharray="4 3"
            stroke-width="1.5"
          />
          {/* 0.2 uM */}
          <polyline
            fill="none"
            points="42,24 88,24 88,34 126,34 126,52 168,52 168,72 206,72 206,89 262,89 262,92 324,92"
            stroke="var(--muted-foreground)"
            stroke-width="1.8"
          />
          {/* 2.0 uM */}
          <polyline
            fill="none"
            points="42,24 68,24 68,42 92,42 92,69 118,69 118,98 150,98 150,122 196,122 196,136 324,136"
            stroke="var(--foreground)"
            stroke-width="2.1"
          />
        </svg>
      </FigureFrame>

      <FigureFrame
        caption="Single-ROI propidium iodide uptake Trace with 10th-percentile background subtraction and sustained step call at t_death."
        eyebrow="Single-ROI call · viability.csv"
        legend={
          <>
            <LegendSwatch label="PI signal F_corr" />
            <LegendSwatch dashed label="Two-regime step fit" />
          </>
        }
        title="Single-cell death-reporter step transition"
      >
        <svg
          aria-label="Sample single-cell propidium iodide fluorescence trace with detected step transition at t_death equals 6.5 hours"
          class="h-auto w-full select-none"
          role="img"
          viewBox="0 0 340 185"
        >
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="24" y2="24" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="66" y2="66" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="108" y2="108" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="150" y2="150" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="42" y1="18" y2="150" />

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="27">
            900
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="69">
            600
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="111">
            300
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="153">
            0
          </text>
          <text
            fill="var(--muted-foreground)"
            font-size="9"
            text-anchor="middle"
            transform="rotate(-90 12 86)"
            x="12"
            y="86"
          >
            PI F_corr (a.u.)
          </text>

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="42" y="164">
            0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="112" y="164">
            6
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="164">
            12
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="253" y="164">
            18
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="324" y="164">
            24
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="179">
            Timepoint (h)
          </text>

          {/* t_death vertical call */}
          <line
            stroke="var(--muted-foreground)"
            stroke-dasharray="2 2"
            stroke-width="1"
            x1="118"
            x2="118"
            y1="24"
            y2="150"
          />
          <text fill="var(--foreground)" font-size="9" font-weight="600" x="123" y="34">
            t_death = 6.5 h
          </text>

          {/* Raw corrected PI trace */}
          <polyline
            fill="none"
            points="42,146 62,144 82,147 102,145 114,143 122,58 138,44 166,46 202,42 248,45 288,43 324,44"
            stroke="var(--foreground)"
            stroke-width="2"
          />
          {/* Step regime fit */}
          <polyline
            fill="none"
            points="42,145 118,145 118,44 324,44"
            stroke="var(--muted-foreground)"
            stroke-dasharray="4 3"
            stroke-width="1.5"
          />
        </svg>
      </FigureFrame>
    </div>
  );
}

function CancerImmunologyFigures() {
  return (
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FigureFrame
        caption="Mean T cells touching the Otsu tumor Mask per ROI across Frames (watershed-split T-cell localizations, D = 10 px)."
        eyebrow="Engagement · engagement_traces_summary.png"
        legend={
          <>
            <LegendSwatch label="CAR-T 1:4 (mean)" />
            <LegendSwatch band label="IQR" />
            <LegendSwatch dashed label="Untransduced T 1:4" />
          </>
        }
        title="Mean T-cell engagements per tumor ROI"
      >
        <svg
          aria-label="Sample T-cell engagement plot showing mean engagements per tumor ROI over 12 hours for CAR-T 1:4 versus Untransduced T 1:4"
          class="h-auto w-full select-none"
          role="img"
          viewBox="0 0 340 185"
        >
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="24" y2="24" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="66" y2="66" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="108" y2="108" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="150" y2="150" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="42" y1="18" y2="150" />

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="27">
            3.0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="69">
            2.0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="111">
            1.0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="153">
            0.0
          </text>
          <text
            fill="var(--muted-foreground)"
            font-size="9"
            text-anchor="middle"
            transform="rotate(-90 12 86)"
            x="12"
            y="86"
          >
            Engagements / ROI
          </text>

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="42" y="164">
            0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="112" y="164">
            3
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="164">
            6
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="253" y="164">
            9
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="324" y="164">
            12
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="179">
            Timepoint (h)
          </text>

          {/* CAR-T IQR band */}
          <polygon
            fill="var(--foreground)"
            fill-opacity="0.12"
            points="42,140 88,78 136,42 183,48 230,62 277,74 324,84 324,114 277,106 230,96 183,84 136,78 88,108 42,148"
          />
          {/* CAR-T mean */}
          <polyline
            fill="none"
            points="42,144 88,93 136,60 183,66 230,79 277,90 324,99"
            stroke="var(--foreground)"
            stroke-width="2"
          />
          {/* Untransduced T mean */}
          <polyline
            fill="none"
            points="42,146 88,139 136,136 183,138 230,137 277,140 324,141"
            stroke="var(--muted-foreground)"
            stroke-dasharray="4 3"
            stroke-width="1.6"
          />
        </svg>
      </FigureFrame>

      <FigureFrame
        caption="Companion death-reporter workflow on the same Sample layout tracks target-cell loss following effector engagement."
        eyebrow="Death reporter · survival_curve.png"
        legend={
          <>
            <LegendSwatch dashed label="Tumor only" />
            <LegendSwatch color="var(--muted-foreground)" label="Untransduced T 1:4" />
            <LegendSwatch label="CAR-T 1:4" />
          </>
        }
        title="Companion target-cell survival"
      >
        <svg
          aria-label="Sample target-cell survival plot comparing Tumor only, Untransduced T 1:4, and CAR-T 1:4 over 12 hours"
          class="h-auto w-full select-none"
          role="img"
          viewBox="0 0 340 185"
        >
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="24" y2="24" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="66" y2="66" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="108" y2="108" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="150" y2="150" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="42" y1="18" y2="150" />

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="27">
            100%
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="69">
            67%
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="111">
            33%
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="153">
            0%
          </text>
          <text
            fill="var(--muted-foreground)"
            font-size="9"
            text-anchor="middle"
            transform="rotate(-90 12 86)"
            x="12"
            y="86"
          >
            Viable target cells
          </text>

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="42" y="164">
            0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="112" y="164">
            3
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="164">
            6
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="253" y="164">
            9
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="324" y="164">
            12
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="179">
            Timepoint (h)
          </text>

          {/* Tumor only */}
          <polyline
            fill="none"
            points="42,24 196,24 196,27 324,27"
            stroke="var(--muted-foreground)"
            stroke-dasharray="4 3"
            stroke-width="1.5"
          />
          {/* Untransduced T */}
          <polyline
            fill="none"
            points="42,24 136,24 136,31 230,31 230,37 324,37"
            stroke="var(--muted-foreground)"
            stroke-width="1.7"
          />
          {/* CAR-T 1:4 */}
          <polyline
            fill="none"
            points="42,24 82,24 82,38 118,38 118,64 162,64 162,96 212,96 212,118 268,118 268,128 324,128"
            stroke="var(--foreground)"
            stroke-width="2.1"
          />
        </svg>
      </FigureFrame>
    </div>
  );
}

function ExpressionKineticsFigures() {
  return (
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FigureFrame
        caption="Individual micropatterned cells exhibit distinct Onset times (t0), peak amplitudes, and mRNA decay slopes around a shared Protein lifetime."
        eyebrow="Single-cell traces · traces.png"
        legend={
          <>
            <LegendSwatch color="var(--instrument-gfp)" label="Individual ROI GFP Traces" />
            <LegendSwatch dashed label="Sample median" />
          </>
        }
        title="Cell-to-cell heterogeneity on micropatterns"
      >
        <svg
          aria-label="Sample single-cell expression plot showing four heterogeneous GFP traces and Sample median over 20 hours"
          class="h-auto w-full select-none"
          role="img"
          viewBox="0 0 340 185"
        >
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="24" y2="24" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="66" y2="66" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="108" y2="108" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="150" y2="150" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="42" y1="18" y2="150" />

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="27">
            15k
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="69">
            10k
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="111">
            5k
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="153">
            0
          </text>
          <text
            fill="var(--muted-foreground)"
            font-size="9"
            text-anchor="middle"
            transform="rotate(-90 12 86)"
            x="12"
            y="86"
          >
            F_corr (a.u.)
          </text>

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="42" y="164">
            0
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="98" y="164">
            4
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="155" y="164">
            8
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="211" y="164">
            12
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="268" y="164">
            16
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="324" y="164">
            20
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="middle" x="183" y="179">
            Timepoint (h)
          </text>

          {/* Four distinct single-cell GFP traces */}
          <polyline
            fill="none"
            opacity="0.85"
            points="42,148 56,148 82,84 114,32 155,28 211,46 268,69 324,90"
            stroke="var(--instrument-gfp)"
            stroke-width="1.6"
          />
          <polyline
            fill="none"
            opacity="0.7"
            points="42,149 68,148 96,104 132,62 174,56 226,71 278,92 324,108"
            stroke="var(--instrument-gfp)"
            stroke-width="1.5"
          />
          <polyline
            fill="none"
            opacity="0.55"
            points="42,149 84,148 116,118 152,88 196,86 248,100 292,115 324,125"
            stroke="var(--instrument-gfp)"
            stroke-width="1.4"
          />
          <polyline
            fill="none"
            opacity="0.45"
            points="42,149 62,148 88,128 118,112 155,118 211,130 268,139 324,144"
            stroke="var(--instrument-gfp)"
            stroke-width="1.3"
          />
          {/* Sample median */}
          <polyline
            fill="none"
            points="42,149 70,148 100,111 136,76 178,72 230,86 280,104 324,117"
            stroke="var(--foreground)"
            stroke-dasharray="4 3"
            stroke-width="1.8"
          />
        </svg>
      </FigureFrame>

      <FigureFrame
        caption="Workspace parameter plots compare fitted Expression rate (m0·k_TL) and apparent mRNA half-life (τ_mRNA) across Samples."
        eyebrow="Parameter comparison · expression_rate.png"
        legend={
          <>
            <LegendSwatch label="Median & IQR box" />
            <LegendSwatch dashed label="1.5× IQR whiskers" />
          </>
        }
        title="Fitted kinetic parameter distributions"
      >
        <svg
          aria-label="Sample boxplot comparing fitted expression rate and mRNA half-life between N1-methylpseudouridine mRNA and Unmodified mRNA Samples"
          class="h-auto w-full select-none"
          role="img"
          viewBox="0 0 340 185"
        >
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="24" y2="24" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="66" y2="66" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="108" y2="108" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="324" y1="150" y2="150" />
          <line stroke="var(--border)" stroke-width="1" x1="42" x2="42" y1="18" y2="150" />

          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="27">
            30
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="69">
            20
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="111">
            10
          </text>
          <text fill="var(--muted-foreground)" font-size="9" text-anchor="end" x="36" y="153">
            0
          </text>
          <text
            fill="var(--muted-foreground)"
            font-size="9"
            text-anchor="middle"
            transform="rotate(-90 12 86)"
            x="12"
            y="86"
          >
            m0·k_TL (a.u./min)
          </text>

          {/* Boxplot 1: N1-psi mRNA */}
          <line
            stroke="var(--muted-foreground)"
            stroke-dasharray="3 2"
            stroke-width="1.2"
            x1="122"
            x2="122"
            y1="32"
            y2="112"
          />
          <line stroke="var(--foreground)" stroke-width="1.2" x1="108" x2="136" y1="32" y2="32" />
          <line stroke="var(--foreground)" stroke-width="1.2" x1="108" x2="136" y1="112" y2="112" />
          <rect
            fill="var(--background)"
            height="42"
            stroke="var(--foreground)"
            stroke-width="1.5"
            width="48"
            x="98"
            y="50"
          />
          <line stroke="var(--foreground)" stroke-width="2.2" x1="98" x2="146" y1="70" y2="70" />
          <text
            fill="var(--foreground)"
            font-size="9"
            font-weight="500"
            text-anchor="middle"
            x="122"
            y="166"
          >
            N1Ψ mRNA
          </text>
          <text fill="var(--muted-foreground)" font-size="8.5" text-anchor="middle" x="122" y="178">
            τ_mRNA = 4.8 h
          </text>

          {/* Boxplot 2: Unmodified mRNA */}
          <line
            stroke="var(--muted-foreground)"
            stroke-dasharray="3 2"
            stroke-width="1.2"
            x1="242"
            x2="242"
            y1="78"
            y2="138"
          />
          <line stroke="var(--foreground)" stroke-width="1.2" x1="228" x2="256" y1="78" y2="78" />
          <line stroke="var(--foreground)" stroke-width="1.2" x1="228" x2="256" y1="138" y2="138" />
          <rect
            fill="var(--background)"
            height="32"
            stroke="var(--foreground)"
            stroke-width="1.5"
            width="48"
            x="218"
            y="96"
          />
          <line stroke="var(--foreground)" stroke-width="2.2" x1="218" x2="266" y1="114" y2="114" />
          <text
            fill="var(--foreground)"
            font-size="9"
            font-weight="500"
            text-anchor="middle"
            x="242"
            y="166"
          >
            Unmodified mRNA
          </text>
          <text fill="var(--muted-foreground)" font-size="8.5" text-anchor="middle" x="242" y="178">
            τ_mRNA = 2.8 h
          </text>
        </svg>
      </FigureFrame>
    </div>
  );
}

export function StudioResearchFigures(props: { areaId: ResearchAreaId }) {
  return (
    <Switch>
      <Match when={props.areaId === "lnp-delivery"}>
        <LnpBindingFigures />
      </Match>
      <Match when={props.areaId === "pharmacology"}>
        <PharmacologyFigures />
      </Match>
      <Match when={props.areaId === "cancer-immunology"}>
        <CancerImmunologyFigures />
      </Match>
      <Match when={props.areaId === "expression-kinetics"}>
        <ExpressionKineticsFigures />
      </Match>
    </Switch>
  );
}
