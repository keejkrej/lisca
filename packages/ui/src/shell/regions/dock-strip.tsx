import type { JSX } from "solid-js";

import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { regionInsetClass, regionStackGapClass } from "./region-spacing";

export function DockStrip(props: { children?: JSX.Element; class?: string }) {
  return (
    <ScrollArea
      class={cn("h-full min-h-0 w-full", props.class)}
      contentClass="h-full w-max min-w-full"
      orientation="horizontal"
      viewportClass="overscroll-none"
    >
      <div
        class={cn(
          "mx-auto flex h-full min-h-full w-fit flex-row items-stretch",
          regionInsetClass,
          regionStackGapClass,
        )}
      >
        {props.children}
      </div>
    </ScrollArea>
  );
}
