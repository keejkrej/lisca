import { button } from "@ui-sdk/core/button";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, mergeProps, splitProps, type ValidComponent } from "solid-js";
import { cn } from "../../lib/utils";
import { usePart, usePrimitive } from "../../lib/ui-sdk";

const buttonVariants = cva(
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

type ButtonProps<T extends ValidComponent = "button"> = Omit<ComponentProps<T>, "type"> &
  VariantProps<typeof buttonVariants> & {
    as?: T;
    disabled?: boolean;
    focusableWhenDisabled?: boolean;
    pendingAnnouncement?: string;
    type?: "button" | "submit" | "reset";
  };

const Button = <T extends ValidComponent = "button">(props: ButtonProps<T>) => {
  const [local, others] = splitProps(props as ButtonProps, [
    "variant",
    "size",
    "class",
    "disabled",
    "focusableWhenDisabled",
    "type",
    "pendingAnnouncement",
    "onClick",
  ]);
  const handle = usePrimitive(button, () => ({
    disabled: local.disabled,
    focusableWhenDisabled: local.focusableWhenDisabled,
    type: local.type,
    pendingAnnouncement: local.pendingAnnouncement,
    action: (event) => {
      const handler = local.onClick;
      const click = event as MouseEvent & { currentTarget: HTMLButtonElement; target: Element };
      if (typeof handler === "function") return handler(click);
      if (handler) return handler[0](handler[1], click);
    },
  }));
  return usePart(
    handle,
    "root",
    undefined,
    mergeProps(others, {
      get class() {
        return cn(buttonVariants({ variant: local.variant, size: local.size }), local.class);
      },
    }),
    "button",
  );
};

export { Button, type ButtonProps, buttonVariants };
