import type { JSX } from "solid-js";

import { cn } from "#lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export const COMING_SOON_IN_VERSION = "Coming soon in version 1.0.";

/** Wraps a disabled control so the release note shows on hover, not beside the label. */
export function ComingSoonTooltip(props: { children: JSX.Element; class?: string }) {
  return (
    <Tooltip openDelay={200} placement="top">
      <TooltipTrigger
        as="span"
        class={cn("inline-flex min-w-0", props.class)}
        delay={200}
        tabIndex={0}
      >
        {props.children}
      </TooltipTrigger>
      <TooltipContent class="max-w-56 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-4 tracking-normal">
        {COMING_SOON_IN_VERSION}
      </TooltipContent>
    </Tooltip>
  );
}
