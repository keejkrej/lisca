import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";

/** Bordered in-app frame (dock, viewport, nav rail). Shell-internal; use Panel/ViewportCard in apps. */
export const panelFrameClass =
  "rounded-none border border-border bg-background text-foreground shadow-none";

export type PanelElementOptions = {
  readonly class?: string | undefined;
};

export function Panel<M>(h: Html.H<M>, options: PanelElementOptions = {}) {
  return h.div
    .attr("data-slot", "panel")
    .class(cn("relative flex flex-col", panelFrameClass, options.class));
}

export function PanelHeader<M>(h: Html.H<M>, options: PanelElementOptions = {}) {
  return h.div.attr("data-slot", "panel-header").class(cn("shrink-0", options.class));
}

export function PanelTitle<M>(h: Html.H<M>, options: PanelElementOptions = {}) {
  return h.div
    .attr("data-slot", "panel-title")
    .class(cn("font-display font-semibold leading-none", options.class));
}

export function PanelDescription<M>(h: Html.H<M>, options: PanelElementOptions = {}) {
  return h.div
    .attr("data-slot", "panel-description")
    .class(cn("text-muted-foreground text-sm", options.class));
}

export function PanelContent<M>(h: Html.H<M>, options: PanelElementOptions = {}) {
  return h.div.attr("data-slot", "panel-content").class(cn("min-h-0 flex-1", options.class));
}
