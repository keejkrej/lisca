import type { Html } from "@effect/ui/html";
import { Toggle as KitToggle, type ToggleElement } from "@effect/ui-kit";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const toggleVariants = cva(
  "group/toggle z-toggle inline-flex items-center justify-center whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "z-toggle-variant-default",
        outline: "z-toggle-variant-outline",
      },
      size: {
        default: "z-toggle-size-default",
        sm: "z-toggle-size-sm",
        lg: "z-toggle-size-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ToggleOptions<M, R = never> = VariantProps<typeof toggleVariants> & {
  readonly element?: ToggleElement<M, R> | undefined;
  readonly class?: string | undefined;
  readonly pressed: boolean;
  readonly disabled?: boolean | undefined;
  readonly onToggle?: ((event: { readonly pressed: boolean }) => M | undefined) | undefined;
  readonly ariaLabel?: string | undefined;
  readonly title?: string | undefined;
};

export function Toggle<M, R = never>(h: Html.H<M>, options: ToggleOptions<M, R>) {
  let builder = KitToggle(h, {
    ...(options.element !== undefined ? { element: options.element } : {}),
    props: {
      pressed: options.pressed,
      ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
    },
    ...(options.onToggle !== undefined ? { onToggle: options.onToggle } : {}),
  })
    .attr("data-slot", "toggle")
    .class(cn(toggleVariants({ variant: options.variant, size: options.size }), options.class));

  if (options.ariaLabel !== undefined) {
    builder = builder.attr("aria-label", options.ariaLabel);
  }
  if (options.title !== undefined) {
    builder = builder.attr("title", options.title);
  }
  return builder;
}
