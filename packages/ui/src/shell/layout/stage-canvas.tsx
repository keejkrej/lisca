import type { JSX } from "solid-js";

import { cn } from "../../lib/utils";

/**
 * Shared stage framing: muted well that fills the viewport + tracked caption pinned below it.
 * `captionCenter` hosts transient status (e.g. inline canvas toasts) so it never covers the image.
 * Pair with `ViewportCard` so Aligner, Annotator, and Studio stay in sync.
 */
export function StageCanvas(props: {
  children?: JSX.Element;
  class?: string;
  wellClass?: string;
  captionLeft?: JSX.Element;
  captionRight?: JSX.Element;
  captionCenter?: JSX.Element;
}) {
  return (
    <div class={cn("flex h-full min-h-0 w-full flex-col gap-3", props.class)}>
      <div
        class={cn("min-h-0 w-full flex-1 overflow-hidden rounded-none bg-muted", props.wellClass)}
      >
        {props.children}
      </div>
      <div class="flex h-7 shrink-0 items-center gap-4 px-1 text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
        <span class="shrink-0 whitespace-nowrap">{props.captionLeft}</span>
        <div class="flex min-w-0 flex-1 justify-center">{props.captionCenter}</div>
        <span class="shrink-0 whitespace-nowrap">{props.captionRight}</span>
      </div>
    </div>
  );
}
