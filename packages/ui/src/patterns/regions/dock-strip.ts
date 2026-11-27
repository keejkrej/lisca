import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";

import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { regionInsetClass, regionStackGapClass } from "./region-spacing";

export type DockStripOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly class?: string | undefined;
  readonly children: View.Input<M, R>;
};

export function DockStrip<M, R = never>(h: Html.H<M>, options: DockStripOptions<M, R>) {
  return ScrollArea(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    class: cn("h-full min-h-0 w-full", options.class),
    contentClass: "h-full w-max min-w-full",
    orientation: "horizontal",
    viewportClass: "overscroll-none",
    children: h.div
      .class(
        cn(
          "mx-auto flex h-full min-h-full w-fit flex-row items-stretch",
          regionInsetClass,
          regionStackGapClass,
        ),
      )
      .children(options.children),
  });
}
