import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";

import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";

export type RailControlLayoutOptions = {
  readonly class?: string | undefined;
};

export type RailActionPairOptions = {
  /** Accessible task-scope name shared by the pair, such as History or Bulk exclusion. */
  readonly label: string;
  readonly class?: string | undefined;
};

export type RailSidebarOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly children: View.Input<M, R>;
};

/**
 * Full-width stage-rail scroller with a 200px measure pinned to a 28px leading margin.
 *
 * The scroller owns the complete 256px rail. Its overlay scrollbar sits over the trailing
 * margin without taking width, so overflow does not move the text.
 */
export function RailSidebar<M, R = never>(h: Html.H<M>, options: RailSidebarOptions<M, R>) {
  let root = h.div
    .attr("data-rail-layout", "sidebar")
    .attr("data-slot", "rail-sidebar-scroll")
    .class(cn("h-full w-full min-h-0", options.class));

  if (options.ariaLabel !== undefined) {
    root = root.attr("aria-label", options.ariaLabel);
  }

  return root.children(
    ScrollArea(h, {
      ...(options.key !== undefined ? { key: options.key } : {}),
      class: "h-full w-full min-h-0",
      contentClass: "flex flex-col items-start py-2.5",
      viewportClass: "overscroll-none",
      children: RailSectionStack(h, {
        class: "my-auto ml-rail-inset w-rail-content shrink-0",
      }).children(options.children),
    }),
  );
}

/** Canonical 16px rhythm between independently collapsible stage-rail sections. */
export function RailSectionStack<M>(h: Html.H<M>, options: RailControlLayoutOptions = {}) {
  return h.div
    .attr("data-rail-layout", "section-stack")
    .attr("data-slot", "rail-section-stack")
    .class(cn("flex w-full min-w-0 flex-col items-stretch gap-4", options.class));
}

/** Default composition for independent controls in the 200px instrument rail. */
export function RailControlStack<M>(h: Html.H<M>, options: RailControlLayoutOptions = {}) {
  return h.div
    .attr("data-rail-layout", "stack")
    .attr("data-slot", "rail-control-stack")
    .class(cn("flex w-full min-w-0 flex-col gap-2", options.class));
}

/** Two short, product-authored actions with one task scope; never use for dynamic labels. */
export function RailActionPair<M>(h: Html.H<M>, options: RailActionPairOptions) {
  return h.div
    .attr("aria-label", options.label)
    .attr("data-rail-layout", "action-pair")
    .attr("data-slot", "rail-action-pair")
    .attr("role", "group")
    .class(
      cn(
        "grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(6rem,100%),1fr))] gap-2",
        options.class,
      ),
    );
}

/**
 * A semantic pair of peer fields (X/Y or Width/Height).
 * Two 96px cells fit at the canonical 200px rail measure; narrower containers stack them.
 */
export function RailFieldPair<M>(h: Html.H<M>, options: RailControlLayoutOptions = {}) {
  return h.div
    .attr("data-rail-layout", "field-pair")
    .attr("data-slot", "rail-field-pair")
    .class(
      cn(
        "grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(6rem,100%),1fr))] gap-2",
        options.class,
      ),
    );
}
