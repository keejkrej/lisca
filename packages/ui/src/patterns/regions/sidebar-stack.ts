import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";

import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { regionInsetClass, regionStackGapClass } from "./region-spacing";

export type SidebarStackOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly children: View.Input<M, R>;
};

export function SidebarStack<M, R = never>(h: Html.H<M>, options: SidebarStackOptions<M, R>) {
  const scroll = ScrollArea(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    class: "h-full w-full min-h-0",
    contentClass: cn(
      "flex flex-col items-stretch",
      regionInsetClass,
      regionStackGapClass,
      options.class,
    ),
    viewportClass: "overscroll-none",
    children: options.children,
  });

  if (options.ariaLabel === undefined) {
    return scroll;
  }

  return h.div
    .attr("aria-label", options.ariaLabel)
    .class("h-full w-full min-h-0")
    .children(scroll);
}
