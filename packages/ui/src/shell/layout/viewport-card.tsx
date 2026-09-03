import type { JSX } from "solid-js";

import { cn } from "../../lib/utils";

/** Padded main-sheet frame that centers `StageCanvas` well + caption framing. */
export function ViewportCard(props: {
  children?: JSX.Element;
  class?: string;
  contentClass?: string;
}) {
  return (
    <div
      class={cn(
        "flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-background p-6",
        props.class,
      )}
    >
      <div
        class={cn(
          "flex min-h-0 min-w-0 max-h-full w-full max-w-full flex-1 flex-col overflow-hidden",
          props.contentClass,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}
