import type { Html } from "@effect/ui/html";
import type { VariationExcludePreviewResponse } from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { ModalScrim } from "@lisca/ui/patterns";
import { Slider } from "@lisca/ui/slider";
import {
  deriveVariationExcludePreview,
  formatVariationScore,
  nextVariationExcludeThreshold,
} from "@lisca/ui-headless/variation-exclude-preview";

export type VariationExcludePreviewState = {
  readonly preview: VariationExcludePreviewResponse;
  readonly threshold: number;
} | null;

export type VariationExcludeDialogOptions<M> = {
  readonly key?: string | undefined;
  readonly state: VariationExcludePreviewState;
  readonly onApply: M;
  readonly onCancel: M;
  readonly onThresholdChange: (threshold: number) => M | undefined;
};

export type VariationExcludeDialogProps<M = never> = VariationExcludeDialogOptions<M>;

export function VariationExcludeDialog<M>(h: Html.H<M>, options: VariationExcludeDialogOptions<M>) {
  const input = options.state
    ? { preview: options.state.preview, threshold: options.state.threshold }
    : null;
  const derived = deriveVariationExcludePreview(input);
  if (!derived) return undefined;

  const { preview, threshold, selectedCount, metrics } = derived;

  return ModalScrim(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    maxWidth: "lg",
    ariaLabelledby: "var-exclude-title",
    onDismiss: () => options.onCancel,
    children: [
      h.div
        .class("border-b border-border px-5 py-3")
        .children(
          h.h2
            .attr("id", "var-exclude-title")
            .class("font-semibold text-foreground text-base")
            .children("Log-std exclude"),
        ),
      h.div.class("flex flex-col gap-3 px-5 py-4").children(
        h.div
          .attr("aria-label", "Log-std mask histogram")
          .class(
            "flex h-28 items-end gap-0.5 rounded-md border border-border bg-background/50 px-2 py-2",
          )
          .children(
            ...preview.histogramBins.map((bin, index) => {
              const active = bin.end <= threshold;
              return h.div
                .key(String(index))
                .class(
                  cn(
                    "min-w-0 flex-1 rounded-t-sm",
                    active ? "bg-primary" : "bg-muted-foreground/28",
                  ),
                )
                .style({
                  height: `${Math.max(4, (bin.count / metrics.maxBinCount) * 100)}%`,
                })
                .attr(
                  "title",
                  `${formatVariationScore(bin.start)} - ${formatVariationScore(bin.end)}: ${bin.count}`,
                );
            }),
          ),
        h.div.class("space-y-2").children(
          h.div
            .class("flex items-center justify-between gap-3")
            .children(
              h.label
                .attr("for", "variation-threshold")
                .class("font-medium text-foreground text-sm")
                .children("Threshold"),
              h.span
                .class("text-muted-foreground text-sm tabular-nums")
                .children(formatVariationScore(threshold)),
            ),
          Slider(h, {
            key: "variation-threshold",
            ariaLabel: "Log-std threshold",
            id: "variation-threshold",
            max: metrics.max,
            min: metrics.min,
            step: metrics.step,
            value: threshold,
            onValueChange: (value) => {
              const next = nextVariationExcludeThreshold(input, value);
              return next != null ? options.onThresholdChange(next) : undefined;
            },
          }),
          h.p
            .class("text-muted-foreground text-sm")
            .children(`Exclude ${selectedCount} of ${preview.eligiblePatternCount} patterns`),
        ),
      ),
      h.div.class("flex justify-end gap-2 border-t border-border px-5 py-3").children(
        Button(h, {
          type: "button",
          variant: "outline",
          onPress: options.onCancel,
        }).children("Cancel"),
        Button(h, {
          type: "button",
          onPress: options.onApply,
        }).children("Apply"),
      ),
    ],
  });
}
