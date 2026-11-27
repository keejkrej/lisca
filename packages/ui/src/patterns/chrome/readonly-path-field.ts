import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";

const pathChipClass = "rounded-md border border-border bg-muted/20 text-foreground";

export type ReadonlyPathFieldOptions = {
  readonly value: string;
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
};

export function ReadonlyPathField<M>(h: Html.H<M>, options: ReadonlyPathFieldOptions) {
  return h.div
    .attr("aria-label", options.ariaLabel ?? `Path ${options.value}`)
    .attr("title", options.value)
    .class(
      cn(
        "flex h-8 w-full min-w-0 items-center self-stretch truncate px-2 font-mono text-xs",
        pathChipClass,
        options.class,
      ),
    )
    .children(options.value);
}
