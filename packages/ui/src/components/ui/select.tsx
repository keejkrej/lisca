import { select, type SelectOptions } from "@ui-sdk/core/select";
import IconCaretDownRegular from "phosphor-icons-solid/IconCaretDownRegular";
import IconCheckRegular from "phosphor-icons-solid/IconCheckRegular";
import {
  type ComponentProps,
  createContext,
  For,
  type JSX,
  mergeProps,
  splitProps,
  useContext,
} from "solid-js";
import { createParts, providePrimitive, useHandle, usePart, usePrimitive } from "../../lib/ui-sdk";
import { cn } from "../../lib/utils";
import { ScrollArea } from "./scroll-area";

type Placement = "bottom" | "top" | "bottom-start" | "bottom-end" | "top-start" | "top-end";
type SelectItemValue<O> = { rawValue: O; key: string; textValue: string; disabled?: boolean };
type SelectProps<O> = Omit<ComponentProps<"div">, "onChange" | "children"> & {
  children?: JSX.Element;
  options: O[];
  value?: O | null;
  defaultValue?: O | null;
  onChange?: (value: O | null) => void;
  optionValue?: (option: O) => string | number;
  optionTextValue?: (option: O) => string;
  optionDisabled?: (option: O) => boolean;
  itemComponent?: (props: { item: SelectItemValue<O> }) => JSX.Element;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  required?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  gutter?: number;
  sameWidth?: boolean;
};
const SelectContext = createContext<SelectProps<unknown>>();
const parts = createParts(select, {
  group: "div",
  label: "span",
  separator: "hr",
  "item-indicator": "span",
});

function Select<O>(props: SelectProps<O>) {
  const handle = usePrimitive(
    select,
    () =>
      ({
        value: props.value,
        defaultValue: props.defaultValue,
        onValueChange: props.onChange,
        open: props.open,
        onOpenChange: props.onOpenChange,
        disabled: props.disabled,
        name: props.name,
        required: props.required,
        placeholder: props.placeholder,
        items: props.options.map((value) => ({
          value,
          label: props.optionTextValue?.(value) ?? String(value),
          disabled: props.optionDisabled?.(value),
        })),
        itemToValue: (value: O) => String(props.optionValue?.(value) ?? value),
        itemToLabel: (value: O) => props.optionTextValue?.(value) ?? String(value),
      }) as SelectOptions<O>,
  );
  return providePrimitive(handle, () => (
    <SelectContext.Provider value={props as unknown as SelectProps<unknown>}>
      <div class={props.class} id={props.id}>
        {props.children}
        {usePart(handle, "form-input", undefined, {}, "input")}
      </div>
    </SelectContext.Provider>
  ));
}

function SelectValue<O>(
  props: Omit<ComponentProps<"span">, "children"> & {
    children?: JSX.Element | ((state: { selectedOption: () => O | undefined }) => JSX.Element);
  },
) {
  const handle = useHandle(select);
  const [local, rest] = splitProps(props, ["class", "children"]);
  return usePart(
    handle,
    "value",
    undefined,
    mergeProps(rest, {
      get class() {
        return cn(
          "z-select-value",
          handle.state.value == null && "text-muted-foreground",
          local.class,
        );
      },
      get children() {
        return typeof local.children === "function"
          ? local.children({ selectedOption: () => handle.state.value as O | undefined })
          : (local.children ?? ((state: { label: string }) => state.label));
      },
    }),
    "span",
  );
}

function SelectTrigger(props: ComponentProps<"button"> & { size?: "sm" | "default" }) {
  const [local, rest] = splitProps(props, ["class", "children", "size"]);
  return usePart(
    select,
    "trigger",
    undefined,
    mergeProps(rest, {
      get class() {
        return cn(
          "z-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
          local.class,
        );
      },
      get "data-size"() {
        return local.size ?? "default";
      },
      get children() {
        return (
          <>
            {local.children}
            <IconCaretDownRegular
              aria-hidden="true"
              class="pointer-events-none z-select-trigger-icon text-foreground"
            />
          </>
        );
      },
    }),
    "button",
  );
}

function SelectContent(props: ComponentProps<"div">) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be inside Select");
  const [local, rest] = splitProps(props, ["class", "children"]);
  return usePart(
    select,
    "content",
    () => {
      const [side = "bottom", align = "start"] = (context.placement ?? "bottom-start").split("-");
      return { side, align, sideOffset: context.gutter ?? 4 };
    },
    mergeProps(rest, {
      get class() {
        return cn(
          "isolate z-50 z-menu-target z-select-content min-w-32 origin-(--transform-origin) overflow-hidden",
          context.sameWidth !== false && "min-w-(--anchor-width)",
          local.class,
        );
      },
      get children() {
        return (
          <ScrollArea viewportClass="max-h-80">
            <div class="m-0 p-1">
              <For each={context.options}>
                {(value) => {
                  const item = {
                    rawValue: value,
                    get key() {
                      return String(context.optionValue?.(value) ?? value);
                    },
                    get textValue() {
                      return context.optionTextValue?.(value) ?? String(value);
                    },
                    get disabled() {
                      return context.optionDisabled?.(value);
                    },
                  };
                  return (
                    context.itemComponent?.({ item }) ?? (
                      <SelectItem item={item}>{item.textValue}</SelectItem>
                    )
                  );
                }}
              </For>
            </div>
          </ScrollArea>
        );
      },
    }),
    "div",
  );
}

function SelectItem<O>(props: ComponentProps<"div"> & { item: SelectItemValue<O> }) {
  const handle = useHandle(select);
  const [local, rest] = splitProps(props, ["item", "class", "children"]);
  return usePart(
    select,
    "item",
    () => ({
      id: handle.api.internal.keyOf(local.item.rawValue),
      value: local.item.rawValue,
      label: local.item.textValue,
      disabled: local.item.disabled,
    }),
    mergeProps(rest, {
      get class() {
        return cn(
          "relative z-select-item flex w-full cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          local.class,
        );
      },
      get children() {
        return (
          <>
            <span class="z-select-item-text shrink-0 whitespace-nowrap">{local.children}</span>
            <parts.ItemIndicator class="z-select-item-indicator">
              <IconCheckRegular
                aria-hidden="true"
                class="pointer-events-none z-select-item-indicator-icon"
              />
            </parts.ItemIndicator>
          </>
        );
      },
    }),
    "div",
  );
}

const SelectGroup = parts.Group;
const SelectLabel = parts.Label;
const SelectSeparator = parts.Separator;
export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
};
