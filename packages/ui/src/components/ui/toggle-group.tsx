import { ToggleGroup as KobalteToggleGroup } from "@kobalte/core/toggle-group";
import type { VariantProps } from "class-variance-authority";
import {
  createContext,
  Show,
  splitProps,
  useContext,
  type Context,
  type JSX,
  type ParentProps,
} from "solid-js";

import { cn } from "../../lib/utils";
import { Separator, type SeparatorProps } from "./separator";
import { toggleVariants } from "./toggle";

type ToggleGroupSize = NonNullable<VariantProps<typeof toggleVariants>["size"]>;
type ToggleGroupVariant = NonNullable<VariantProps<typeof toggleVariants>["variant"]>;

export const ToggleGroupSizeContext: Context<ToggleGroupSize> = createContext<ToggleGroupSize>("default");
export const ToggleGroupVariantContext: Context<ToggleGroupVariant> =
  createContext<ToggleGroupVariant>("default");

type ToggleGroupValue = string | string[] | null | undefined;

export function ToggleGroup(
  props: ParentProps<{
    class?: string;
    variant?: ToggleGroupVariant;
    size?: ToggleGroupSize;
    orientation?: "horizontal" | "vertical";
    multiple?: boolean;
    disabled?: boolean;
    value?: ToggleGroupValue;
    defaultValue?: ToggleGroupValue;
    onValueChange?: (value: string[]) => void;
    onChange?: (value: string | string[] | null) => void;
  }>,
): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "variant",
    "size",
    "orientation",
    "children",
    "multiple",
    "value",
    "defaultValue",
    "onValueChange",
    "onChange",
  ]);

  const variant = () => local.variant ?? "default";
  const size = () => local.size ?? "default";
  const orientation = () => local.orientation ?? "horizontal";
  const isMultiple = () => local.multiple === true;

  const toArray = (value: ToggleGroupValue) => {
    if (value == null) return [] as string[];
    return Array.isArray(value) ? value : [value];
  };

  const kobalteValue = () => {
    if (isMultiple()) return toArray(local.value);
    const next = toArray(local.value);
    return next[0] ?? null;
  };

  const kobalteDefaultValue = () => {
    if (isMultiple()) return toArray(local.defaultValue);
    const next = toArray(local.defaultValue);
    return next[0];
  };

  const handleChange = (next: string | string[] | null) => {
    local.onChange?.(next);
    if (local.onValueChange) {
      if (Array.isArray(next)) {
        local.onValueChange(next);
      } else if (next == null) {
        local.onValueChange([]);
      } else {
        local.onValueChange([next]);
      }
    }
  };

  const groupClass = () =>
    cn(
      "flex w-fit *:focus-visible:z-10 dark:*:[[data-slot=separator]:has(+[data-slot=toggle]:hover)]:before:bg-input/64 dark:*:[[data-slot=separator]:has(+[data-slot=toggle][data-pressed])]:before:bg-input dark:*:[[data-slot=toggle]:hover+[data-slot=separator]]:before:bg-input/64 dark:*:[[data-slot=toggle][data-pressed]+[data-slot=separator]]:before:bg-input",
      orientation() === "horizontal"
        ? "*:pointer-coarse:after:min-w-auto"
        : "*:pointer-coarse:after:min-h-auto",
      variant() === "default"
        ? "gap-0.5"
        : orientation() === "horizontal"
          ? "*:not-first:rounded-s-none *:not-last:rounded-e-none *:not-first:border-s-0 *:not-last:border-e-0 *:not-first:not-data-[slot=separator]:before:-start-[0.5px] *:not-last:not-data-[slot=separator]:before:-end-[0.5px] *:not-first:before:rounded-s-none *:not-last:before:rounded-e-none"
          : "flex-col *:not-first:rounded-t-none *:not-last:rounded-b-none *:not-first:border-t-0 *:not-last:border-b-0 *:not-first:not-data-[slot=separator]:before:-top-[0.5px] *:not-last:not-data-[slot=separator]:before:-bottom-[0.5px] *:not-first:before:rounded-t-none *:not-last:before:rounded-b-none *:data-[slot=toggle]:not-last:before:hidden dark:*:last:before:hidden dark:*:first:before:block",
      local.class,
    );

  const groupChildren = (
    <ToggleGroupSizeContext.Provider value={size()}>
      <ToggleGroupVariantContext.Provider value={variant()}>
        {local.children}
      </ToggleGroupVariantContext.Provider>
    </ToggleGroupSizeContext.Provider>
  );

  return (
    <Show
      when={isMultiple()}
      fallback={
        <KobalteToggleGroup
          class={groupClass()}
          data-size={size()}
          data-slot="toggle-group"
          data-variant={variant()}
          defaultValue={kobalteDefaultValue() as string | undefined}
          orientation={orientation()}
          value={kobalteValue() as string | null}
          onChange={handleChange}
          {...rest}
        >
          {groupChildren}
        </KobalteToggleGroup>
      }
    >
      <KobalteToggleGroup
        class={groupClass()}
        data-size={size()}
        data-slot="toggle-group"
        data-variant={variant()}
        defaultValue={kobalteDefaultValue() as string[] | undefined}
        multiple
        orientation={orientation()}
        value={kobalteValue() as string[]}
        onChange={handleChange}
        {...rest}
      >
        {groupChildren}
      </KobalteToggleGroup>
    </Show>
  );
}

export function ToggleGroupItem(
  props: {
    class?: string;
    variant?: ToggleGroupVariant;
    size?: ToggleGroupSize;
    value: string;
    disabled?: boolean;
  } & JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children", "variant", "size", "value", "disabled"]);
  const contextSize = useContext(ToggleGroupSizeContext);
  const contextVariant = useContext(ToggleGroupVariantContext);

  const resolvedVariant = () => contextVariant || local.variant;
  const resolvedSize = () => contextSize || local.size;

  return (
    <KobalteToggleGroup.Item
      class={cn(toggleVariants({ variant: resolvedVariant(), size: resolvedSize() }), local.class)}
      data-size={resolvedSize()}
      data-slot="toggle"
      data-variant={resolvedVariant()}
      disabled={local.disabled}
      value={local.value}
      {...rest}
    >
      {local.children}
    </KobalteToggleGroup.Item>
  );
}

export function ToggleGroupSeparator(props: { class?: string } & SeparatorProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "orientation"]);

  return (
    <Separator
      class={cn(
        "pointer-events-none relative bg-input before:absolute before:inset-0 dark:before:bg-input/32",
        local.class,
      )}
      orientation={local.orientation ?? "vertical"}
      {...rest}
    />
  );
}

export { KobalteToggleGroup as ToggleGroupPrimitive };