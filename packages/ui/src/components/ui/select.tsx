import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Select as KobalteSelect } from "@kobalte/core/select";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-solid";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  splitProps,
  useContext,
  type Accessor,
  type JSX,
  type ParentProps,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "../../lib/utils";

type SelectSide = "top" | "right" | "bottom" | "left";
type SelectAlign = "start" | "center" | "end";

type SelectItemRecord<T> = {
  value: T;
  label: JSX.Element;
  class?: string;
  disabled?: boolean;
  textValue?: string;
};

type SelectItemsProp<T> = Array<{ value: T; label?: JSX.Element; disabled?: boolean; textValue?: string }>;

type SelectPositionOptions = {
  placement?: ReturnType<typeof toPlacement>;
  gutter?: number;
  shift?: number;
};

interface SelectContextValue<T> {
  registerOption: (option: SelectItemRecord<T>) => void;
  unregisterOption: (value: T) => void;
  optionMap: Accessor<Map<T, SelectItemRecord<T>>>;
  setPlaceholder: (placeholder: JSX.Element | undefined) => void;
  setPosition: (position: SelectPositionOptions) => void;
}

const SelectContext = createContext<SelectContextValue<unknown>>();

function toPlacement(side: SelectSide = "bottom", align: SelectAlign = "start") {
  if (align === "center") return side;
  return `${side}-${align}` as const;
}

function useSelectContext<T>(): SelectContextValue<T> {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select");
  }
  return context as SelectContextValue<T>;
}

const selectTriggerVariants = cva(
  "relative inline-flex min-h-9 w-full min-w-36 select-none items-center justify-between gap-2 rounded-lg border border-input bg-background not-dark:bg-clip-padding px-[calc(--spacing(3)-1px)] text-left text-base text-foreground shadow-xs/5 outline-none ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-data-disabled:not-focus-visible:not-aria-invalid:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/16 data-disabled:pointer-events-none data-disabled:opacity-64 sm:min-h-8 sm:text-sm dark:bg-input/32 dark:aria-invalid:ring-destructive/24 dark:not-data-disabled:not-focus-visible:not-aria-invalid:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/6%)] [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [[data-disabled],:focus-visible,[aria-invalid],[data-pressed]]:shadow-none",
  {
    defaultVariants: {
      size: "default",
    },
    variants: {
      size: {
        default: "",
        lg: "min-h-10 sm:min-h-9",
        sm: "min-h-8 gap-1.5 px-[calc(--spacing(2.5)-1px)] sm:min-h-7",
      },
    },
  },
);

const selectTriggerIconClassName = "-me-1 size-4.5 opacity-80 sm:size-4";

function SelectItemRenderer<T>(props: { item: { rawValue: T; key: string; textValue: string; disabled: boolean } }) {
  const context = useSelectContext<T>();
  const option = () => context.optionMap().get(props.item.rawValue);

  return (
    <KobalteSelect.Item
      class={cn(
        "grid min-h-8 in-data-[side=none]:min-w-[calc(var(--anchor-width)+1.25rem)] cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm py-1 ps-2 pe-4 text-base outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        option()?.class,
      )}
      data-slot="select-item"
      item={props.item as never}
    >
      <KobalteSelect.ItemIndicator class="col-start-1">
        <svg
          aria-hidden="true"
          fill="none"
          height="24"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
        </svg>
      </KobalteSelect.ItemIndicator>
      <KobalteSelect.ItemLabel class="col-start-2 min-w-0">
        {option()?.label ?? String(props.item.rawValue)}
      </KobalteSelect.ItemLabel>
    </KobalteSelect.Item>
  );
}

function Select<T = unknown>(
  props: ParentProps<{
    value?: T | null;
    defaultValue?: T;
    onValueChange?: (value: T | null) => void;
    onChange?: (value: T | null) => void;
    items?: SelectItemsProp<T>;
    disabled?: boolean;
    modal?: boolean;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    name?: string;
    required?: boolean;
    readOnly?: boolean;
    multiple?: false;
    class?: string;
  }>,
) {
  const [local, rest] = splitProps(props, [
    "children",
    "value",
    "defaultValue",
    "onValueChange",
    "onChange",
    "items",
    "disabled",
    "modal",
    "open",
    "defaultOpen",
    "onOpenChange",
    "name",
    "required",
    "readOnly",
    "multiple",
    "class",
  ]);

  const [registeredOptions, setRegisteredOptions] = createSignal<SelectItemRecord<T>[]>([]);
  const [placeholder, setPlaceholder] = createSignal<JSX.Element | undefined>();
  const [position, setPosition] = createSignal<SelectPositionOptions>({
    gutter: 4,
    placement: "bottom-start",
    shift: 0,
  });

  const optionMap = createMemo(() => {
    const map = new Map<T, SelectItemRecord<T>>();

    if (local.items) {
      for (const item of local.items) {
        map.set(item.value, {
          value: item.value,
          label: item.label ?? String(item.value),
          disabled: item.disabled,
          textValue: item.textValue,
        });
      }
    }

    for (const option of registeredOptions()) {
      map.set(option.value, option);
    }

    return map;
  });

  const options = createMemo(() => Array.from(optionMap().keys()));

  const context: SelectContextValue<T> = {
    registerOption: (option) => {
      setRegisteredOptions((prev) => [...prev.filter((entry) => entry.value !== option.value), option]);
    },
    unregisterOption: (value) => {
      setRegisteredOptions((prev) => prev.filter((entry) => entry.value !== value));
    },
    optionMap,
    setPlaceholder,
    setPosition,
  };

  const handleChange = (value: T | null) => {
    local.onValueChange?.(value);
    local.onChange?.(value);
  };

  return (
    <SelectContext.Provider value={context as SelectContextValue<unknown>}>
      <KobalteSelect
        class={local.class}
        defaultOpen={local.defaultOpen}
        defaultValue={local.defaultValue}
        disabled={local.disabled}
        gutter={position().gutter}
        itemComponent={(itemProps) => <SelectItemRenderer item={itemProps.item} />}
        modal={local.modal}
        name={local.name}
        open={local.open}
        placement={position().placement}
        shift={position().shift}
        optionTextValue={(option) => {
          const entry = optionMap().get(option as T);
          return entry?.textValue ?? (typeof entry?.label === "string" ? entry.label : String(option));
        }}
        options={options()}
        placeholder={placeholder()}
        readOnly={local.readOnly}
        required={local.required}
        value={local.value ?? null}
        onChange={handleChange}
        onOpenChange={local.onOpenChange}
        {...rest}
      >
        {local.children}
      </KobalteSelect>
    </SelectContext.Provider>
  );
}

interface SelectButtonProps<T extends ValidComponent = "button"> {
  class?: string;
  size?: VariantProps<typeof selectTriggerVariants>["size"];
  render?: T;
  as?: T;
}

function SelectButton<T extends ValidComponent = "button">(
  props: SelectButtonProps<T> & Omit<PolymorphicProps<T>, "as"> & ParentProps,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "size", "render", "as"]);
  const as = () => local.as ?? local.render ?? "button";
  const isPolymorphic = () => as() !== "button";

  return (
    <Dynamic
      component={as()}
      class={cn(selectTriggerVariants({ size: local.size }), "min-w-0", local.class)}
      data-slot="select-button"
      type={isPolymorphic() ? undefined : "button"}
      {...rest}
    >
      <span class="flex-1 truncate in-data-placeholder:text-muted-foreground/72">{props.children}</span>
      <ChevronsUpDown class={selectTriggerIconClassName} />
    </Dynamic>
  );
}

function SelectTrigger(
  props: ParentProps<{
    class?: string;
    size?: VariantProps<typeof selectTriggerVariants>["size"];
    disabled?: boolean;
    id?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
  }>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "size", "children"]);

  return (
    <KobalteSelect.Trigger
      class={cn(selectTriggerVariants({ size: local.size }), local.class)}
      data-slot="select-trigger"
      {...rest}
    >
      {local.children}
      <KobalteSelect.Icon data-slot="select-icon">
        <ChevronsUpDown class={selectTriggerIconClassName} />
      </KobalteSelect.Icon>
    </KobalteSelect.Trigger>
  );
}

function SelectValue(props: { class?: string; placeholder?: JSX.Element }): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "placeholder"]);
  const context = useSelectContext();

  createEffect(() => {
    context.setPlaceholder(local.placeholder);
  });

  onCleanup(() => {
    context.setPlaceholder(undefined);
  });

  return (
    <KobalteSelect.Value
      class={cn("flex-1 truncate data-[placeholder-shown]:text-muted-foreground", local.class)}
      data-slot="select-value"
      {...rest}
    />
  );
}

function SelectContent(
  props: ParentProps<{
    class?: string;
    side?: SelectSide;
    sideOffset?: number;
    align?: SelectAlign;
    alignOffset?: number;
    alignItemWithTrigger?: boolean;
    anchor?: HTMLElement;
  }>,
): JSX.Element {
  const [local] = splitProps(props, [
    "class",
    "children",
    "side",
    "sideOffset",
    "align",
    "alignOffset",
    "alignItemWithTrigger",
    "anchor",
  ]);
  const context = useSelectContext();

  createEffect(() => {
    context.setPosition({
      gutter: local.sideOffset ?? 4,
      placement: toPlacement(local.side ?? "bottom", local.align ?? "start"),
      shift: local.alignOffset ?? 0,
    });
  });

  return (
    <KobalteSelect.Portal>
      <KobalteSelect.Content
        class="origin-(--transform-origin) text-foreground outline-none"
        data-slot="select-popup"
      >
        <div class="top-0 z-50 flex h-6 w-full cursor-default items-center justify-center before:pointer-events-none before:absolute before:inset-x-px before:top-px before:h-[200%] before:rounded-t-[calc(var(--radius-lg)-1px)] before:bg-linear-to-b before:from-50% before:from-popover">
          <ChevronUp class="relative size-4.5 sm:size-4" data-slot="select-scroll-up-arrow" />
        </div>
        <div class="relative h-full min-w-(--anchor-width) rounded-lg border bg-popover not-dark:bg-clip-padding shadow-lg/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]">
          <KobalteSelect.Listbox
            class={cn("max-h-(--available-height) overflow-y-auto p-1", local.class)}
            data-slot="select-list"
          />
        </div>
        <div class="bottom-0 z-50 flex h-6 w-full cursor-default items-center justify-center before:pointer-events-none before:absolute before:inset-x-px before:bottom-px before:h-[200%] before:rounded-b-[calc(var(--radius-lg)-1px)] before:bg-linear-to-t before:from-50% before:from-popover">
          <ChevronDown class="relative size-4.5 sm:size-4" data-slot="select-scroll-down-arrow" />
        </div>
      </KobalteSelect.Content>
    </KobalteSelect.Portal>
  );
}

function SelectItem<T = unknown>(
  props: ParentProps<{
    value: T;
    class?: string;
    disabled?: boolean;
    textValue?: string;
  }>,
): null {
  const [local] = splitProps(props, ["value", "class", "children", "disabled", "textValue"]);
  const context = useSelectContext<T>();

  createEffect(() => {
    context.registerOption({
      value: local.value,
      label: local.children as JSX.Element,
      class: local.class,
      disabled: local.disabled,
      textValue: local.textValue,
    });
  });

  onCleanup(() => {
    context.unregisterOption(local.value);
  });

  return null;
}

function SelectSeparator(props: { class?: string }): JSX.Element {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <hr
      class={cn("mx-2 my-1 h-px border-0 bg-border", local.class)}
      data-slot="select-separator"
      {...rest}
    />
  );
}

function SelectGroup(props: ParentProps): JSX.Element {
  const [local, rest] = splitProps(props, ["children"]);

  return (
    <KobalteSelect.Section data-slot="select-group" {...rest}>
      {local.children}
    </KobalteSelect.Section>
  );
}

function SelectLabel(props: ParentProps<{ class?: string }>): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <KobalteSelect.Label
      class={cn(
        "not-in-data-[slot=field]:mb-2 inline-flex cursor-default items-center gap-2 font-medium text-base/4.5 text-foreground sm:text-sm/4",
        local.class,
      )}
      data-slot="select-label"
      {...rest}
    >
      {local.children}
    </KobalteSelect.Label>
  );
}

function SelectGroupLabel(props: ParentProps): JSX.Element {
  const [local, rest] = splitProps(props, ["children"]);

  return (
    <div class="px-2 py-1.5 font-medium text-muted-foreground text-xs" data-slot="select-group-label" {...rest}>
      {local.children}
    </div>
  );
}

export {
  Select,
  SelectButton,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectLabel,
  KobalteSelect as SelectPrimitive,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};