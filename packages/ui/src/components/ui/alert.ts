import type { Html } from "@effect/ui/html";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const alertVariants = cva("group/alert relative z-alert w-full", {
  variants: {
    variant: {
      default: "z-alert-variant-default",
      destructive: "z-alert-variant-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type AlertOptions = VariantProps<typeof alertVariants> & {
  readonly class?: string | undefined;
};

export function Alert<M>(h: Html.H<M>, options: AlertOptions = {}) {
  return h.div
    .attr("data-slot", "alert")
    .attr("role", "alert")
    .class(cn(alertVariants({ variant: options.variant }), options.class));
}

export function AlertTitle<M>(h: Html.H<M>, options: { readonly class?: string | undefined } = {}) {
  return h.div
    .attr("data-slot", "alert-title")
    .class(
      cn(
        "z-alert-title z-font-heading [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        options.class,
      ),
    );
}

export function AlertDescription<M>(
  h: Html.H<M>,
  options: { readonly class?: string | undefined } = {},
) {
  return h.div
    .attr("data-slot", "alert-description")
    .class(
      cn(
        "z-alert-description [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        options.class,
      ),
    );
}

export function AlertAction<M>(
  h: Html.H<M>,
  options: { readonly class?: string | undefined } = {},
) {
  return h.div.attr("data-slot", "alert-action").class(cn("z-alert-action", options.class));
}
