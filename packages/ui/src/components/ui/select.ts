import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";
import { Select as KitSelect, type SelectItem as KitSelectItem } from "@effect/ui-kit";

import { Icon } from "../../icons";
import { cn } from "../../lib/utils";
import { parsePlacement, type Placement } from "./popover";

export type SelectOptionItem = {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean | undefined;
};

export type SelectOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly class?: string | undefined;
  readonly triggerClass?: string | undefined;
  readonly valueClass?: string | undefined;
  readonly contentClass?: string | undefined;
  readonly triggerSize?: "sm" | "default" | undefined;
  readonly ariaLabel?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly open: boolean;
  readonly value: string | null;
  readonly items: readonly SelectOptionItem[];
  readonly placement?: Placement | undefined;
  readonly gutter?: number | undefined;
  readonly sameWidth?: boolean | undefined;
  readonly renderValue?:
    | ((selected: SelectOptionItem | undefined) => View.Content<M, R>)
    | undefined;
  readonly renderItem?: ((item: SelectOptionItem) => View.Content<M, R>) | undefined;
  readonly onOpenChange?: ((open: boolean) => M | undefined) | undefined;
  readonly onChange?: ((value: string | null) => M | undefined) | undefined;
};

export function Select<M, R = never>(h: Html.H<M>, options: SelectOptions<M, R>) {
  const position = parsePlacement(options.placement ?? "bottom-start", options.gutter ?? 4);
  const kitItems: readonly KitSelectItem[] = options.items.map((item) => ({
    value: item.value,
    label: item.label,
    ...(item.disabled !== undefined ? { disabled: item.disabled } : {}),
  }));
  const selectedItem =
    options.value === null ? undefined : options.items.find((item) => item.value === options.value);

  return KitSelect(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      open: options.open,
      items: kitItems,
      value: options.value,
      side: position.side,
      align: position.align,
      sideOffset: position.sideOffset,
      alignItemWithTrigger: false,
      ...(options.id !== undefined ? { id: options.id } : {}),
      ...(options.name !== undefined ? { name: options.name } : {}),
      ...(options.placeholder !== undefined ? { placeholder: options.placeholder } : {}),
      ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
      ...(options.required !== undefined ? { required: options.required } : {}),
    },
    onEmit: {
      RequestedOpen: () => options.onOpenChange?.(true),
      RequestedClose: () => options.onOpenChange?.(false),
      Picked: ({ value }) => {
        const next = Array.isArray(value) ? (value[0] ?? null) : value;
        return options.onChange?.(next);
      },
      Settled: () => undefined,
    },
    view: (select) => {
      let trigger = select
        .trigger(h.button)
        .attr("data-slot", "select-trigger")
        .attr("data-size", options.triggerSize ?? "default")
        .class(
          cn(
            "z-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
            options.triggerClass,
          ),
        );

      if (options.ariaLabel !== undefined) {
        trigger = trigger.attr("aria-label", options.ariaLabel);
      }

      const valueContent = options.renderValue
        ? options.renderValue(selectedItem)
        : (selectedItem?.label ?? options.placeholder ?? "");

      return h.div.class(cn(options.class)).children(
        trigger.children(
          select
            .value(h.span)
            .attr("data-slot", "select-value")
            .class(
              cn(
                "z-select-value",
                selectedItem === undefined && "text-muted-foreground",
                options.valueClass,
              ),
            )
            .children(valueContent),
          select
            .icon(h.span)
            .class("pointer-events-none inline-flex items-center")
            .children(
              Icon(h, "caret-down", {
                class: "pointer-events-none z-select-trigger-icon text-foreground",
              }),
            ),
        ),
        select.mounted
          ? select
              .positioner(h.div)
              .class("z-50")
              .children(
                select
                  .popup(h.div)
                  .attr("data-slot", "select-content")
                  .class(
                    cn(
                      "isolate z-50 z-menu-target z-select-content min-w-32 origin-(--transform-origin) overflow-hidden",
                      options.sameWidth !== false && "min-w-(--anchor-width)",
                      options.contentClass,
                    ),
                  )
                  .children(
                    select
                      .list(h.div)
                      .class("m-0 max-h-80 overflow-y-auto p-1")
                      .children(
                        ...options.items.map((item) =>
                          select
                            .item({ element: h.div.key(item.value), value: item.value })
                            .attr("data-slot", "select-item")
                            .class(
                              "relative z-select-item flex w-full cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                            )
                            .children(
                              select
                                .itemText(h.div)
                                .class("z-select-item-text shrink-0 whitespace-nowrap")
                                .children(
                                  options.renderItem ? options.renderItem(item) : item.label,
                                ),
                              select
                                .itemIndicator({
                                  element: h.span.class("z-select-item-indicator"),
                                  value: item.value,
                                })
                                ?.children(
                                  Icon(h, "check", {
                                    class: "pointer-events-none z-select-item-indicator-icon",
                                  }),
                                ),
                            ),
                        ),
                      ),
                  ),
              )
          : undefined,
      );
    },
  });
}

export { KitSelect };
