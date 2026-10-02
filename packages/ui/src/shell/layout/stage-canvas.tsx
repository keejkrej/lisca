import type { JSX } from "solid-js";

import { cn } from "../../lib/utils";

/**
 * Shared stage framing: paper well that fills the viewport + tracked caption pinned below it.
 * `notice` is a transient toast. The toast stack portals itself to the bottom-left of the
 * window. The caption row stays for position and size. Pair with `ViewportCard` so Aligner,
 * Annotator, and Studio stay in sync.
 */
export function StageCanvas(props: {
  children?: JSX.Element;
  class?: string;
  wellClass?: string;
  captionLeft?: JSX.Element;
  captionRight?: JSX.Element;
  captionCenter?: JSX.Element;
  notice?: JSX.Element;
}) {
  return (
    <div class={cn("flex h-full min-h-0 w-full flex-col gap-3", props.class)}>
      <div
        class={cn(
          "relative min-h-0 w-full flex-1 overflow-hidden rounded-none bg-paper",
          props.wellClass,
        )}
      >
        {props.children}
        {props.notice}
      </div>
      <div class="flex h-7 shrink-0 items-center gap-4 px-1 text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
        <span class="shrink-0 whitespace-nowrap">{props.captionLeft}</span>
        <div class="flex min-w-0 flex-1 justify-center">{props.captionCenter}</div>
        <span class="shrink-0 whitespace-nowrap">{props.captionRight}</span>
      </div>
    </div>
  );
}
