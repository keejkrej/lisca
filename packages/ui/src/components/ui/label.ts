import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";

export type LabelOptions = {
  readonly class?: string | undefined;
  readonly for?: string | undefined;
};

export function Label<M>(h: Html.H<M>, options: LabelOptions = {}) {
  let builder = h.label
    .attr("data-slot", "label")
    .class(
      cn(
        "z-label flex select-none items-center peer-disabled:cursor-not-allowed group-data-[disabled=true]:pointer-events-none",
        options.class,
      ),
    );
  if (options.for !== undefined) {
    builder = builder.attr("for", options.for);
  }
  return builder;
}
