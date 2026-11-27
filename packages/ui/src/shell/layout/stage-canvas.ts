import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";

import { cn } from "../../lib/utils";

export type StageCanvasOptions<M, R = never> = {
  readonly children?: View.Input<M, R> | undefined;
  readonly class?: string | undefined;
  readonly wellClass?: string | undefined;
  readonly captionLeft?: View.Input<M, R> | undefined;
  readonly captionRight?: View.Input<M, R> | undefined;
  readonly captionCenter?: View.Input<M, R> | undefined;
  readonly notice?: View.Input<M, R> | undefined;
};

/**
 * Shared stage framing: paper well that fills the viewport + tracked caption pinned below it.
 * `notice` is a transient toast. The caption row stays for position and size. Pair with
 * `ViewportCard` so Aligner, Annotator, and Studio stay in sync.
 */
export function StageCanvas<M, R = never>(h: Html.H<M>, options: StageCanvasOptions<M, R>) {
  return h.div
    .class(cn("flex h-full min-h-0 w-full flex-col gap-5", options.class))
    .children(
      h.div
        .class(
          cn(
            "relative min-h-0 w-full flex-1 overflow-hidden rounded-none bg-paper",
            options.wellClass,
          ),
        )
        .children(options.children),
      options.notice,
      h.div
        .class(
          "flex h-7 shrink-0 items-center gap-4 px-1 text-[11px] text-muted-foreground uppercase tracking-[0.12em]",
        )
        .children(
          h.span.class("shrink-0 whitespace-nowrap").children(options.captionLeft),
          h.div.class("flex min-w-0 flex-1 justify-center").children(options.captionCenter),
          h.span.class("shrink-0 whitespace-nowrap").children(options.captionRight),
        ),
    );
}
