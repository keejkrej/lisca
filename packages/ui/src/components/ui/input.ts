import type { Html } from "@effect/ui/html";
import { Input as KitInput } from "@effect/ui-kit";

import { cn } from "../../lib/utils";

export type InputOptions<M> = {
  readonly value?: string | undefined;
  readonly type?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly name?: string | undefined;
  readonly id?: string | undefined;
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly onInput?: ((value: string) => M | undefined) | undefined;
};

export function Input<M>(h: Html.H<M>, options: InputOptions<M> = {}) {
  let builder =
    options.value !== undefined || options.onInput !== undefined
      ? KitInput(h, {
          props: {
            value: options.value ?? "",
            ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
          },
          ...(options.onInput !== undefined
            ? { onUpdate: ({ value }: { readonly value: string }) => options.onInput?.(value) }
            : {}),
        })
      : h.input;

  builder = builder
    .attr("data-slot", "input")
    .class(
      cn(
        "z-input w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        options.class,
      ),
    );

  if (options.type !== undefined) builder = builder.attr("type", options.type);
  if (options.ariaLabel !== undefined) builder = builder.attr("aria-label", options.ariaLabel);
  if (options.id !== undefined) builder = builder.id(options.id);
  if (options.placeholder !== undefined) builder = builder.attr("placeholder", options.placeholder);
  if (options.name !== undefined) builder = builder.attr("name", options.name);
  if (options.readOnly) builder = builder.attr("readonly", "");
  if (options.required) builder = builder.attr("required", "");
  if (options.value === undefined && options.onInput === undefined) {
    if (options.disabled !== undefined) builder = builder.disabled(options.disabled);
  }
  return builder;
}
