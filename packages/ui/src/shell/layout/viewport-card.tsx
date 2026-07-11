import type { JSX } from "solid-js";

import { cn } from "../../lib/utils";
import { panelFrameClass } from "../regions/panel";
import { regionInsetClass } from "../regions/region-spacing";

/** Padded main-column frame for canvas, plots, and other primary viewport content. */
export function ViewportCard(props: { children?: JSX.Element; class?: string }) {
  return (
    <div class={cn("flex h-full min-h-0 flex-1 flex-col bg-background", regionInsetClass, props.class)}>
      <div class={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", panelFrameClass)}>
        {props.children}
      </div>
    </div>
  );
}