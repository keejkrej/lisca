import type { JSX } from "solid-js";

import { cn } from "../../lib/utils";
import { panelFrameClass } from "../regions/panel";
import { regionInsetClass } from "../regions/region-spacing";

/** Padded main-column frame; `stage` centers content for `StageCanvas` well + caption framing. */
export function ViewportCard(props: {
  children?: JSX.Element;
  class?: string;
  contentClass?: string;
  variant?: "default" | "stage";
}) {
  const stage = () => props.variant === "stage";

  return (
    <div
      class={cn(
        "flex h-full min-h-0 flex-1 flex-col bg-background",
        stage() ? "items-center justify-center p-6" : regionInsetClass,
        props.class,
      )}
    >
      <div
        class={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          stage() ? "max-h-full w-full max-w-full" : panelFrameClass,
          props.contentClass,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}
