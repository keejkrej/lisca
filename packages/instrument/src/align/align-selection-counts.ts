import type { Html } from "@effect/ui/html";

export type AlignSelectionCountsOptions = {
  readonly included: number;
  readonly excluded: number;
};

export type AlignSelectionCountsProps = AlignSelectionCountsOptions;

export function AlignSelectionCounts<M>(h: Html.H<M>, options: AlignSelectionCountsOptions) {
  return h.div
    .class("flex flex-col gap-1")
    .children(
      h.div
        .class("flex items-center justify-between text-sm")
        .children(
          h.span.class("text-muted-foreground").children("Included patterns"),
          h.span.class("font-medium tabular-nums").children(String(options.included)),
        ),
      h.div
        .class("flex items-center justify-between text-sm")
        .children(
          h.span.class("text-muted-foreground").children("Excluded patterns"),
          h.span.class("font-medium tabular-nums").children(String(options.excluded)),
        ),
    );
}
