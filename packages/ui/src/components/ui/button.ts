import type { Html } from "@effect/ui/html";
import { Button as KitButton, type ButtonElement } from "@effect/ui-kit";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "group/button z-button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap outline-none transition-[color,background-color,border-color,box-shadow,opacity,transform] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "z-button-variant-default",
        outline: "z-button-variant-outline",
        secondary: "z-button-variant-secondary",
        ghost: "z-button-variant-ghost",
        destructive: "z-button-variant-destructive",
        link: "z-button-variant-link",
      },
      size: {
        default: "z-button-size-default",
        xs: "z-button-size-xs",
        sm: "z-button-size-sm",
        lg: "z-button-size-lg",
        icon: "z-button-size-icon",
        "icon-xs": "z-button-size-icon-xs",
        "icon-sm": "z-button-size-icon-sm",
        "icon-lg": "z-button-size-icon-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonOptions<M, R = never> = VariantProps<typeof buttonVariants> & {
  readonly element?: ButtonElement<M, R> | undefined;
  readonly class?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly focusableWhenDisabled?: boolean | undefined;
  readonly type?: "button" | "submit" | "reset" | undefined;
  readonly onPress?: M | undefined;
  readonly ariaLabel?: string | undefined;
  readonly title?: string | undefined;
};

/**
 * LiSCA-styled button backed by `@effect/ui-kit`'s `Button`.
 * Returns the `<button>` builder so callers can chain `.attr(...)`, `.class(...)`, and `.children(...)`.
 */
export function Button<M, R = never>(h: Html.H<M>, options: ButtonOptions<M, R> = {}) {
  let builder = KitButton(h, {
    ...(options.element !== undefined ? { element: options.element } : {}),
    props: {
      ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
      ...(options.focusableWhenDisabled !== undefined
        ? { focusableWhenDisabled: options.focusableWhenDisabled }
        : {}),
      type: options.type ?? "button",
    },
    ...(options.onPress !== undefined ? { onPress: options.onPress } : {}),
  }).class(cn(buttonVariants({ variant: options.variant, size: options.size }), options.class));

  if (options.ariaLabel !== undefined) {
    builder = builder.attr("aria-label", options.ariaLabel);
  }
  if (options.title !== undefined) {
    builder = builder.attr("title", options.title);
  }
  return builder;
}
