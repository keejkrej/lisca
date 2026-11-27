import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";
import {
  ToggleGroup as KitToggleGroup,
  type ToggleGroupItem as KitToggleGroupItem,
  type ToggleGroupOrientation,
} from "@effect/ui-kit";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { toggleVariants } from "./toggle";

export type ToggleGroupStyle = VariantProps<typeof toggleVariants> & {
  readonly spacing?: number | undefined;
};

export type ToggleGroupItemSpec<M, R = never> = {
  readonly value: string;
  readonly disabled?: boolean | undefined;
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly title?: string | undefined;
  readonly content: View.Input<M, R>;
};

export type ToggleGroupOptions<M, R = never> = ToggleGroupStyle & {
  readonly key?: string | undefined;
  readonly value: readonly string[];
  readonly items: readonly ToggleGroupItemSpec<M, R>[];
  readonly multiple?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly orientation?: ToggleGroupOrientation | undefined;
  readonly loopFocus?: boolean | undefined;
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly onChange?: ((value: readonly string[]) => M | undefined) | undefined;
};

export function ToggleGroup<M, R = never>(h: Html.H<M>, options: ToggleGroupOptions<M, R>) {
  const spacing = options.spacing ?? 0;
  const kitItems: readonly KitToggleGroupItem[] = options.items.map((item) => ({
    value: item.value,
    ...(item.disabled !== undefined ? { disabled: item.disabled } : {}),
  }));

  return KitToggleGroup(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      value: options.value,
      items: kitItems,
      ...(options.multiple !== undefined ? { multiple: options.multiple } : {}),
      ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
      ...(options.orientation !== undefined ? { orientation: options.orientation } : {}),
      ...(options.loopFocus !== undefined ? { loopFocus: options.loopFocus } : {}),
    },
    onEmit: {
      Toggled: ({ value }) => options.onChange?.(value),
    },
    view: (group) => {
      let root = group
        .root(h.div)
        .attr("data-slot", "toggle-group")
        .attr("data-spacing", String(spacing))
        .style({ "--gap": String(spacing) })
        .class(
          cn(
            "group/toggle-group z-toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
            options.class,
          ),
        );

      if (options.variant !== undefined && options.variant !== null) {
        root = root.attr("data-variant", options.variant);
      }
      if (options.size !== undefined && options.size !== null) {
        root = root.attr("data-size", options.size);
      }
      if (options.ariaLabel !== undefined) {
        root = root.attr("aria-label", options.ariaLabel);
      }

      return root.children(
        ...options.items.map((item) => {
          let button = group
            .item({ element: h.button.key(item.value), value: item.value })
            .attr("data-slot", "toggle")
            .attr("data-lisca-slot", "toggle-group-item")
            .attr("data-spacing", String(spacing))
            .class(
              cn(
                toggleVariants({ variant: options.variant, size: options.size }),
                "z-toggle-group-item shrink-0 focus:z-10 focus-visible:z-10 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l",
                item.class,
              ),
            );

          if (options.variant !== undefined && options.variant !== null) {
            button = button.attr("data-variant", options.variant);
          }
          if (options.size !== undefined && options.size !== null) {
            button = button.attr("data-size", options.size);
          }
          if (item.ariaLabel !== undefined) {
            button = button.attr("aria-label", item.ariaLabel);
          }
          if (item.title !== undefined) {
            button = button.attr("title", item.title);
          }
          return button.children(item.content);
        }),
      );
    },
  });
}

export { KitToggleGroup };
