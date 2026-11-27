import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";

import { cn } from "../../lib/utils";

export type ViewportCardOptions<M, R = never> = {
  readonly children?: View.Input<M, R> | undefined;
  readonly class?: string | undefined;
  readonly contentClass?: string | undefined;
};

/** Padded main-sheet frame that centers `StageCanvas` well + caption framing. */
export function ViewportCard<M, R = never>(h: Html.H<M>, options: ViewportCardOptions<M, R>) {
  return h.div
    .class(
      cn(
        "flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-paper p-6",
        options.class,
      ),
    )
    .children(
      h.div
        .class(
          cn(
            "flex min-h-0 min-w-0 max-h-full w-full max-w-full flex-1 flex-col overflow-hidden",
            options.contentClass,
          ),
        )
        .children(options.children),
    );
}
