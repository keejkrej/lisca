import { Separator as KobalteSeparator } from "@kobalte/core/separator";
import { splitProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";

export type SeparatorProps = {
  class?: string;
  orientation?: "horizontal" | "vertical";
};

export function Separator(props: SeparatorProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "orientation"]);

  return (
    <KobalteSeparator
      class={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch",
        local.class,
      )}
      data-slot="separator"
      orientation={local.orientation ?? "horizontal"}
      {...rest}
    />
  );
}

export { KobalteSeparator as SeparatorPrimitive };