import type { JSX } from "solid-js";

import { cn } from "../../lib/utils";

export type StageCanvasAspect = "wide" | "square";

const aspectClassByVariant: Record<StageCanvasAspect, string> = {
  wide: "aspect-[12/7]",
  square: "aspect-square",
};

/**
 * Shared stage framing: muted rounded well + tracked caption under the canvas.
 * Pair with `ViewportCard` so Aligner, Annotator, and Studio stay in sync.
 */
export function StageCanvas(props: {
  children?: JSX.Element;
  aspect?: StageCanvasAspect;
  class?: string;
  wellClass?: string;
  captionLeft?: JSX.Element;
  captionRight?: JSX.Element;
}) {
  return (
    <div class={cn("flex h-full w-full flex-col justify-center gap-3 self-center", props.class)}>
      <div
        class={cn(
          "w-full overflow-hidden rounded-2xl bg-muted",
          aspectClassByVariant[props.aspect ?? "wide"],
          props.wellClass,
        )}
      >
        {props.children}
      </div>
      <div class="flex items-center justify-between gap-4 px-1 text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
        <span>{props.captionLeft}</span>
        <span>{props.captionRight}</span>
      </div>
    </div>
  );
}
