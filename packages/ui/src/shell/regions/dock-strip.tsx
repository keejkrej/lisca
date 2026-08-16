import type { JSX } from "solid-js";

import { cn } from "../../lib/utils";
import { regionInsetClass, regionStackGapClass } from "./region-spacing";

export function DockStrip(props: { children?: JSX.Element; class?: string }) {
  return (
    <div class={cn("h-full min-h-0 w-full overflow-x-auto", props.class)}>
      <div
        class={cn(
          "mx-auto flex h-full min-h-full w-fit flex-row items-stretch",
          regionInsetClass,
          regionStackGapClass,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}
