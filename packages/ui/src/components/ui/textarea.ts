import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";

export type TextareaOptions<M> = {
  readonly value?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly rows?: number | undefined;
  readonly name?: string | undefined;
  readonly id?: string | undefined;
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly onInput?: ((value: string) => M | undefined) | undefined;
};

export function Textarea<M>(h: Html.H<M>, options: TextareaOptions<M> = {}) {
  let builder = h.textarea
    .attr("data-slot", "textarea")
    .class(
      cn(
        "z-textarea flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        options.class,
      ),
    );
  if (options.value !== undefined) builder = builder.value(options.value);
  if (options.placeholder !== undefined) builder = builder.attr("placeholder", options.placeholder);
  if (options.disabled !== undefined) builder = builder.disabled(options.disabled);
  if (options.rows !== undefined) builder = builder.attr("rows", String(options.rows));
  if (options.name !== undefined) builder = builder.attr("name", options.name);
  if (options.id !== undefined) builder = builder.id(options.id);
  if (options.ariaLabel !== undefined) builder = builder.attr("aria-label", options.ariaLabel);
  if (options.onInput !== undefined) {
    const onInput = options.onInput;
    builder = builder.on("input", ({ value }) => onInput(value));
  }
  return builder;
}
