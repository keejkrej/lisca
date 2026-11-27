import type { Html } from "@effect/ui/html";

import { Icon } from "../../icons";
import { cn } from "../../lib/utils";

export function Spinner<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.span
    .attr("role", "status")
    .attr("aria-label", "Loading")
    .attr("data-slot", "spinner")
    .class(cn("z-spinner inline-flex size-4 animate-spin", options.class))
    .children(Icon(h, "circle-notch", { class: "size-full" }));
}
