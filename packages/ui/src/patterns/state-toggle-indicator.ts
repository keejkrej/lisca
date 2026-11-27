import type { Html } from "@effect/ui/html";

import { Icon } from "../icons";

/** Persistent affordance that distinguishes a stateful rail toggle from an ordinary action. */
export function StateToggleIndicator<M>(h: Html.H<M>, options: { readonly pressed: boolean }) {
  return h.span
    .attr("aria-hidden", "true")
    .attr("data-slot", "instrument-toggle-indicator")
    .attr("data-state", options.pressed ? "on" : "off")
    .class(
      "lisca-instrument-toggle-indicator hidden size-3.5 shrink-0 items-center justify-center rounded-none border border-current",
    )
    .children(options.pressed ? Icon(h, "check", { class: "size-2.5" }) : undefined);
}

/** @deprecated Use `StateToggleIndicator`. */
export const AlignStateToggleIndicator = StateToggleIndicator;
