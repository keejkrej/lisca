import type { Html } from "@effect/ui/html";
import { cn } from "@lisca/ui/cn";
import { AlignStateToggleIndicator } from "@lisca/ui/patterns";
import { Toggle } from "@lisca/ui/toggle";

export type AlignEditToggleOptions<M> = {
  readonly enabled: boolean;
  readonly onEnabledChange: (enabled: boolean) => M | undefined;
  readonly disabled?: boolean | undefined;
  readonly class?: string | undefined;
};

export type AlignEditToggleProps<M = never> = AlignEditToggleOptions<M>;

export function AlignEditToggle<M>(h: Html.H<M>, options: AlignEditToggleOptions<M>) {
  return Toggle(h, {
    ariaLabel: "Edit pattern exclusions",
    class: cn("w-full justify-center text-xs", options.class),
    disabled: options.disabled,
    pressed: options.enabled,
    size: "sm",
    variant: "outline",
    onToggle: ({ pressed }) => options.onEnabledChange(pressed),
  })
    .attr("data-instrument-state-toggle", "")
    .children(AlignStateToggleIndicator(h, { pressed: options.enabled }), h.span.children("Edit"));
}
