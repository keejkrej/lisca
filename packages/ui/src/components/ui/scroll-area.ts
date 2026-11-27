import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";
import { ScrollArea as KitScrollArea, type ScrollAreaOrientation } from "@effect/ui-kit";

import { cn } from "../../lib/utils";

export type ScrollAreaOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly class?: string | undefined;
  readonly viewportClass?: string | undefined;
  readonly contentClass?: string | undefined;
  readonly scrollbarClass?: string | undefined;
  readonly orientation?: ScrollAreaOrientation | undefined;
  readonly keepMounted?: boolean | undefined;
  readonly children: View.Input<M, R>;
};

export function ScrollArea<M, R = never>(h: Html.H<M>, options: ScrollAreaOptions<M, R>) {
  const orientation = options.orientation ?? "vertical";
  const isVertical = orientation === "vertical";

  return KitScrollArea(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    view: (scrollArea) =>
      scrollArea
        .root(h.div)
        .attr("data-slot", "scroll-area")
        .class(cn("relative flex flex-col overflow-clip", options.class))
        .children(
          scrollArea
            .viewport(h.div)
            .attr("data-slot", "scroll-area-viewport")
            .class(
              cn(
                "no-scrollbar min-h-0 w-full flex-1 overflow-auto rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                options.viewportClass,
              ),
            )
            .children(
              scrollArea
                .content(h.div)
                .attr("data-slot", "scroll-area-content")
                .class(cn("min-h-full", options.contentClass))
                .children(options.children),
            ),
          scrollArea.scrollbar({
            orientation,
            keepMounted: options.keepMounted ?? true,
            element: h.div
              .attr("data-slot", "scroll-area-scrollbar")
              .class(
                cn(
                  "absolute z-scroll-area-scrollbar flex touch-none select-none p-px opacity-0 transition-opacity duration-150 data-hovering:opacity-100 data-scrolling:opacity-100",
                  isVertical ? "top-0 right-0 bottom-0" : "right-0 bottom-0 left-0 w-full",
                  options.scrollbarClass,
                ),
              ),
            thumb: h.div
              .attr("data-slot", "scroll-area-thumb")
              .class(
                cn(
                  "relative z-scroll-area-thumb cursor-grab bg-muted-foreground/40 hover:bg-muted-foreground/65 active:cursor-grabbing active:bg-muted-foreground/65",
                  isVertical
                    ? "w-full h-[var(--scroll-area-thumb-height)]"
                    : "h-full w-[var(--scroll-area-thumb-width)]",
                ),
              ),
          }),
          scrollArea.corner(h.div.attr("data-slot", "scroll-area-corner")),
        ),
  });
}

export { KitScrollArea };
