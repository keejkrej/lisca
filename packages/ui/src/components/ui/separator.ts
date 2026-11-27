import type { Html } from "@effect/ui/html";
import { Separator as KitSeparator } from "@effect/ui-kit";

import { cn } from "../../lib/utils";

export type SeparatorOptions = {
  readonly orientation?: "horizontal" | "vertical" | undefined;
  readonly decorative?: boolean | undefined;
  readonly class?: string | undefined;
};

export function Separator<M>(h: Html.H<M>, options: SeparatorOptions = {}) {
  const orientation = options.orientation ?? "horizontal";
  const base = options.decorative ? h.div.attr("role", "none") : h.div;
  return KitSeparator(h, {
    element: base,
    props: { orientation },
  })
    .attr("data-slot", "separator")
    .class(
      cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
        options.class,
      ),
    );
}
