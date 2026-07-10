import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { splitProps, type JSX, type ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "../../lib/utils";

export type LabelProps<T extends ValidComponent = "label"> = {
  class?: string;
  htmlFor?: string;
  /** Base UI compat — maps to Kobalte `as`. Prefer `as` for polymorphic rendering. */
  render?: T;
  as?: T;
};

export function Label<T extends ValidComponent = "label">(
  props: LabelProps<T> & Omit<PolymorphicProps<T>, "as">,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "render", "as", "htmlFor"]);

  return (
    <Dynamic
      component={local.as ?? local.render ?? "label"}
      class={cn(
        "inline-flex items-center gap-2 font-medium text-base/4.5 text-foreground sm:text-sm/4",
        local.class,
      )}
      data-slot="label"
      for={local.htmlFor}
      {...rest}
    />
  );
}