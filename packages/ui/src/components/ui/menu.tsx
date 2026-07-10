import { DropdownMenu as KobalteDropdownMenu } from "@kobalte/core/dropdown-menu";
import IconCaretRightRegular from "phosphor-icons-solid/IconCaretRightRegular";
import {
  createContext,
  createEffect,
  createSignal,
  Show,
  splitProps,
  useContext,
  type JSX,
  type ParentProps,
} from "solid-js";

import { cn } from "../../lib/utils";

type MenuSide = "top" | "right" | "bottom" | "left" | "inline-end" | "inline-start";
type MenuAlign = "start" | "center" | "end";

function toPlacement(side: MenuSide = "bottom", align: MenuAlign = "center") {
  if (side === "inline-end") return align === "center" ? "right" : `right-${align}` as const;
  if (side === "inline-start") return align === "center" ? "left" : `left-${align}` as const;
  if (align === "center") return side;
  return `${side}-${align}` as const;
}

type MenuPositionOptions = {
  placement?: ReturnType<typeof toPlacement>;
  gutter?: number;
  shift?: number;
};

const MenuPositionContext = createContext<{
  setPosition: (position: MenuPositionOptions) => void;
}>();

export function MenuCreateHandle(): Record<string, never> {
  return {};
}

export function Menu(props: ParentProps<{ modal?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }>): JSX.Element {
  const [local, rest] = splitProps(props, ["children"]);
  const [position, setPosition] = createSignal<MenuPositionOptions>({
    gutter: 4,
    placement: "bottom",
    shift: 0,
  });

  return (
    <MenuPositionContext.Provider value={{ setPosition }}>
      <KobalteDropdownMenu
        gutter={position().gutter}
        placement={position().placement}
        shift={position().shift}
        {...rest}
      >
        {local.children}
      </KobalteDropdownMenu>
    </MenuPositionContext.Provider>
  );
}
export const MenuPortal = KobalteDropdownMenu.Portal;

export function MenuTrigger(props: ParentProps<{ class?: string }>): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children"]);

  return (
    <KobalteDropdownMenu.Trigger class={local.class} data-slot="menu-trigger" {...rest}>
      {local.children}
    </KobalteDropdownMenu.Trigger>
  );
}

export function MenuPopup(
  props: ParentProps<{
    class?: string;
    sideOffset?: number;
    align?: MenuAlign;
    alignOffset?: number;
    side?: MenuSide;
    portalProps?: Record<string, unknown>;
  }>,
): JSX.Element {
  const [local] = splitProps(props, [
    "children",
    "class",
    "sideOffset",
    "align",
    "alignOffset",
    "side",
    "portalProps",
  ]);
  const positionContext = useContext(MenuPositionContext);

  createEffect(() => {
    positionContext?.setPosition({
      gutter: local.sideOffset ?? 4,
      placement: toPlacement(local.side, local.align),
      shift: local.alignOffset ?? 0,
    });
  });

  return (
    <KobalteDropdownMenu.Portal {...local.portalProps}>
      <KobalteDropdownMenu.Content
        class={cn(
          "relative flex not-[class*='w-']:min-w-32 origin-(--transform-origin) rounded-lg border bg-popover not-dark:bg-clip-padding shadow-lg/5 outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] focus:outline-none dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
          local.class,
        )}
        data-slot="menu-popup"
      >
        <div class="max-h-(--available-height) w-full overflow-y-auto p-1">{local.children}</div>
      </KobalteDropdownMenu.Content>
    </KobalteDropdownMenu.Portal>
  );
}

export function MenuGroup(props: ParentProps): JSX.Element {
  const [local, rest] = splitProps(props, ["children"]);

  return (
    <KobalteDropdownMenu.Group data-slot="menu-group" {...rest}>
      {local.children}
    </KobalteDropdownMenu.Group>
  );
}

export function MenuItem(
  props: ParentProps<{
    class?: string;
    inset?: boolean;
    variant?: "default" | "destructive";
    disabled?: boolean;
    onSelect?: () => void;
    textValue?: string;
  }>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "inset", "variant", "children", "disabled", "onSelect", "textValue"]);

  return (
    <KobalteDropdownMenu.Item
      class={cn(
        "flex min-h-8 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-inset:ps-8 data-[variant=destructive]:text-destructive-foreground data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&>svg:not([class*='opacity-'])]:opacity-80 [&>svg:not([class*='size-'])]:size-4.5 sm:[&>svg:not([class*='size-'])]:size-4 [&>svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:shrink-0",
        local.class,
      )}
      data-inset={local.inset}
      data-slot="menu-item"
      data-variant={local.variant ?? "default"}
      disabled={local.disabled}
      textValue={local.textValue}
      onSelect={local.onSelect}
      {...rest}
    >
      {local.children}
    </KobalteDropdownMenu.Item>
  );
}

export function MenuCheckboxItem(
  props: ParentProps<{
    class?: string;
    checked?: boolean;
    defaultChecked?: boolean;
    variant?: "default" | "switch";
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
    onSelect?: () => void;
  }>,
): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "children",
    "checked",
    "defaultChecked",
    "variant",
    "disabled",
    "onChange",
    "onSelect",
  ]);

  const variant = () => local.variant ?? "default";

  return (
    <KobalteDropdownMenu.CheckboxItem
      checked={local.checked}
      class={cn(
        "grid min-h-8 in-data-[side=none]:min-w-[calc(var(--anchor-width)+1.25rem)] cursor-default items-center gap-2 rounded-sm py-1 ps-2 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        variant() === "switch" ? "grid-cols-[1fr_auto] gap-4 pe-1.5" : "grid-cols-[.75rem_1fr] pe-4",
        local.class,
      )}
      data-slot="menu-checkbox-item"
      defaultChecked={local.defaultChecked}
      disabled={local.disabled}
      onChange={local.onChange}
      onSelect={local.onSelect}
      {...rest}
    >
      <Show
        when={variant() === "switch"}
        fallback={
          <>
            <KobalteDropdownMenu.ItemIndicator class="col-start-1 -ms-0.5">
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
            </KobalteDropdownMenu.ItemIndicator>
            <span class="col-start-2">{local.children}</span>
          </>
        }
      >
        <>
          <span class="col-start-1">{local.children}</span>
          <KobalteDropdownMenu.ItemIndicator
            class="inset-shadow-[0_1px_--theme(--color-black/4%)] inline-flex h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)] shrink-0 items-center rounded-full p-px outline-none transition-[background-color,box-shadow] duration-200 [--thumb-size:--spacing(4)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:bg-primary data-unchecked:bg-input data-disabled:opacity-64 sm:[--thumb-size:--spacing(3)]"
            forceMount
          >
            <span class="pointer-events-none block aspect-square h-full in-[[data-slot=menu-checkbox-item][data-checked]]:origin-[var(--thumb-size)_50%] origin-left in-[[data-slot=menu-checkbox-item][data-checked]]:translate-x-[calc(var(--thumb-size)-4px)] in-[[data-slot=menu-checkbox-item]:active]:not-data-disabled:scale-x-110 in-[[data-slot=menu-checkbox-item]:active]:rounded-[var(--thumb-size)/calc(var(--thumb-size)*1.10)] rounded-(--thumb-size) bg-background shadow-sm/5 will-change-transform [transition:translate_.15s,border-radius_.15s,scale_.1s_.1s,transform-origin_.15s]" />
          </KobalteDropdownMenu.ItemIndicator>
        </>
      </Show>
    </KobalteDropdownMenu.CheckboxItem>
  );
}

export function MenuRadioGroup(
  props: ParentProps<{ value?: string; defaultValue?: string; onChange?: (value: string) => void }>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["children", "value", "defaultValue", "onChange"]);

  return (
    <KobalteDropdownMenu.RadioGroup
      data-slot="menu-radio-group"
      defaultValue={local.defaultValue}
      value={local.value}
      onChange={local.onChange}
      {...rest}
    >
      {local.children}
    </KobalteDropdownMenu.RadioGroup>
  );
}

export function MenuRadioItem(props: ParentProps<{ class?: string; value: string; disabled?: boolean }>): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "children", "value", "disabled"]);

  return (
    <KobalteDropdownMenu.RadioItem
      class={cn(
        "grid min-h-8 in-data-[side=none]:min-w-[calc(var(--anchor-width)+1.25rem)] cursor-default grid-cols-[.75rem_1fr] items-center gap-2 rounded-sm py-1 ps-2 pe-4 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      data-slot="menu-radio-item"
      disabled={local.disabled}
      value={local.value}
      {...rest}
    >
      <KobalteDropdownMenu.ItemIndicator class="col-start-1 -ms-0.5">
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
      </KobalteDropdownMenu.ItemIndicator>
      <span class="col-start-2">{local.children}</span>
    </KobalteDropdownMenu.RadioItem>
  );
}

export function MenuGroupLabel(
  props: ParentProps<{ class?: string; inset?: boolean }>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "inset", "children"]);

  return (
    <KobalteDropdownMenu.GroupLabel
      class={cn(
        "px-2 py-1.5 font-medium text-muted-foreground text-xs data-inset:ps-9 sm:data-inset:ps-8",
        local.class,
      )}
      data-inset={local.inset}
      data-slot="menu-label"
      {...rest}
    >
      {local.children}
    </KobalteDropdownMenu.GroupLabel>
  );
}

export function MenuSeparator(props: { class?: string }): JSX.Element {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <KobalteDropdownMenu.Separator
      class={cn("mx-2 my-1 h-px bg-border", local.class)}
      data-slot="menu-separator"
      {...rest}
    />
  );
}

export function MenuShortcut(props: JSX.HTMLAttributes<HTMLElement>): JSX.Element {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <kbd
      class={cn(
        "ms-auto font-medium font-sans text-muted-foreground/72 text-xs tracking-widest",
        local.class,
      )}
      data-slot="menu-shortcut"
      {...rest}
    />
  );
}

export const MenuSub = KobalteDropdownMenu.Sub;

export function MenuSubTrigger(
  props: ParentProps<{ class?: string; inset?: boolean; disabled?: boolean }>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "inset", "children", "disabled"]);

  return (
    <KobalteDropdownMenu.SubTrigger
      class={cn(
        "flex min-h-8 items-center gap-2 rounded-sm px-2 py-1 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-expanded:bg-accent data-inset:ps-8 data-highlighted:text-accent-foreground data-expanded:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&>svg:not(:last-child)]:-mx-0.5 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        local.class,
      )}
      data-inset={local.inset}
      data-slot="menu-sub-trigger"
      disabled={local.disabled}
      {...rest}
    >
      {local.children}
      <IconCaretRightRegular class="ms-auto -me-0.5 opacity-80" />
    </KobalteDropdownMenu.SubTrigger>
  );
}

export function MenuSubPopup(
  props: ParentProps<{
    class?: string;
    sideOffset?: number;
    alignOffset?: number;
    align?: MenuAlign;
  }>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "sideOffset", "alignOffset", "align"]);
  const defaultAlignOffset = () => (local.align !== "center" ? -5 : undefined);

  return (
    <MenuPopup
      align={local.align ?? "start"}
      alignOffset={local.alignOffset ?? defaultAlignOffset()}
      class={local.class}
      data-slot="menu-sub-content"
      side="inline-end"
      sideOffset={local.sideOffset ?? 0}
      {...rest}
    />
  );
}

export {
  KobalteDropdownMenu as MenuPrimitive,
  MenuCreateHandle as DropdownMenuCreateHandle,
  Menu as DropdownMenu,
  MenuPortal as DropdownMenuPortal,
  MenuTrigger as DropdownMenuTrigger,
  MenuPopup as DropdownMenuContent,
  MenuGroup as DropdownMenuGroup,
  MenuItem as DropdownMenuItem,
  MenuCheckboxItem as DropdownMenuCheckboxItem,
  MenuRadioGroup as DropdownMenuRadioGroup,
  MenuRadioItem as DropdownMenuRadioItem,
  MenuGroupLabel as DropdownMenuLabel,
  MenuSeparator as DropdownMenuSeparator,
  MenuShortcut as DropdownMenuShortcut,
  MenuSub as DropdownMenuSub,
  MenuSubTrigger as DropdownMenuSubTrigger,
  MenuSubPopup as DropdownMenuSubContent,
};