import { Component, Mount } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import { cva, type VariantProps } from "class-variance-authority";
import { Effect } from "effect";

import { cn } from "../../lib/utils";
import { Button, type ButtonOptions } from "./button";
import { Input, type InputOptions } from "./input";
import { Textarea, type TextareaOptions } from "./textarea";

export type InputGroupOptions = {
  readonly class?: string | undefined;
};

export function InputGroup<M>(h: Html.H<M>, options: InputGroupOptions = {}) {
  return h.div
    .attr("data-slot", "input-group")
    .attr("role", "group")
    .class(
      cn(
        "group/input-group z-input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto",
        options.class,
      ),
    );
}

export const inputGroupAddonVariants = cva(
  "z-input-group-addon flex cursor-text items-center justify-center select-none",
  {
    variants: {
      align: {
        "inline-start": "z-input-group-addon-align-inline-start order-first",
        "inline-end": "z-input-group-addon-align-inline-end order-last",
        "block-start": "z-input-group-addon-align-block-start order-first w-full justify-start",
        "block-end": "z-input-group-addon-align-block-end order-last w-full justify-start",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

export type InputGroupAddonOptions = VariantProps<typeof inputGroupAddonVariants> & {
  readonly class?: string | undefined;
};

const FocusSiblingInput = Mount.make(
  "LiscaInputGroupFocusSiblingInput",
  { args: {} },
  (el: HTMLDivElement) =>
    Effect.scoped(
      Effect.acquireRelease(
        Effect.sync(() => {
          const onClick = (event: MouseEvent) => {
            if ((event.target as HTMLElement | null)?.closest("button")) {
              return;
            }
            el.parentElement?.querySelector("input")?.focus();
          };
          el.addEventListener("click", onClick);
          return onClick;
        }),
        (onClick) =>
          Effect.sync(() => {
            el.removeEventListener("click", onClick);
          }),
      ).pipe(Effect.andThen(Effect.never), Effect.as(Component.noop)),
    ),
);

export function InputGroupAddon<M>(h: Html.H<M>, options: InputGroupAddonOptions = {}) {
  const align = options.align ?? "inline-start";
  return h.div
    .attr("role", "group")
    .attr("data-slot", "input-group-addon")
    .attr("data-align", align)
    .class(cn(inputGroupAddonVariants({ align }), options.class))
    .onMount(FocusSiblingInput());
}

export const inputGroupButtonVariants = cva("z-input-group-button flex items-center shadow-none", {
  variants: {
    size: {
      xs: "z-input-group-button-size-xs",
      sm: "z-input-group-button-size-sm",
      "icon-xs": "z-input-group-button-size-icon-xs",
      "icon-sm": "z-input-group-button-size-icon-sm",
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

export type InputGroupButtonOptions<M, R = never> = Omit<ButtonOptions<M, R>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>;

export function InputGroupButton<M, R = never>(
  h: Html.H<M>,
  options: InputGroupButtonOptions<M, R> = {},
) {
  const size = options.size ?? "xs";
  return Button(h, {
    ...options,
    type: options.type ?? "button",
    variant: options.variant ?? "ghost",
    class: cn(inputGroupButtonVariants({ size }), options.class),
  }).attr("data-size", size);
}

export type InputGroupTextOptions = {
  readonly class?: string | undefined;
};

export function InputGroupText<M>(h: Html.H<M>, options: InputGroupTextOptions = {}) {
  return h.span.class(
    cn("z-input-group-text flex items-center [&_svg]:pointer-events-none", options.class),
  );
}

export type InputGroupInputOptions<M> = InputOptions<M>;

export function InputGroupInput<M>(h: Html.H<M>, options: InputGroupInputOptions<M> = {}) {
  return Input(h, {
    ...options,
    class: cn("z-input-group-input flex-1", options.class),
  }).attr("data-slot", "input-group-control");
}

export type InputGroupTextareaOptions<M> = TextareaOptions<M>;

export function InputGroupTextarea<M>(h: Html.H<M>, options: InputGroupTextareaOptions<M> = {}) {
  return Textarea(h, {
    ...options,
    class: cn("z-input-group-textarea flex-1 resize-none", options.class),
  }).attr("data-slot", "input-group-control");
}
