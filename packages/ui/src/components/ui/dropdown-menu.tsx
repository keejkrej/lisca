import { menu, type MenuOptions } from "@ui-sdk/core/menu";
import {
  type ComponentProps,
  createContext,
  createUniqueId,
  type JSX,
  mergeProps,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";
import { createParts, providePrimitive, useHandle, usePart, usePrimitive } from "../../lib/ui-sdk";
import { cn } from "../../lib/utils";
import { ScrollArea } from "./scroll-area";

type Placement = "bottom" | "top" | "bottom-start" | "bottom-end" | "top-start" | "top-end";
type DropdownMenuProps = MenuOptions & {
  children?: JSX.Element;
  placement?: Placement;
  gutter?: number;
  getAnchorRect?: (
    anchor?: HTMLElement,
  ) => { x: number; y: number; width: number; height: number } | undefined;
};
const MenuPositionContext = createContext<DropdownMenuProps>({});
const parts = createParts(menu, { group: "div", separator: "hr", shortcut: "span" });

function DropdownMenu(props: DropdownMenuProps) {
  const handle = usePrimitive(menu, () => ({
    open: props.open,
    defaultOpen: props.defaultOpen,
    onOpenChange: props.onOpenChange,
    modal: props.modal,
  }));
  return providePrimitive(handle, () => (
    <MenuPositionContext.Provider value={props}>{props.children}</MenuPositionContext.Provider>
  ));
}

function DropdownMenuTrigger<T extends ValidComponent = "button">(
  props: ComponentProps<T> & { as?: T; disabled?: boolean },
) {
  const id = createUniqueId();
  const [local, rest] = splitProps(props as ComponentProps<"button"> & { as?: T }, ["disabled"]);
  return usePart(menu, "trigger", () => ({ id, disabled: local.disabled }), rest, "button");
}

function DropdownMenuContent(props: ComponentProps<"div">) {
  const handle = useHandle(menu);
  const defaults = useContext(MenuPositionContext);
  const [local, rest] = splitProps(props, ["class", "children"]);
  return usePart(
    menu,
    "content",
    () => {
      const [side = "bottom", align = "start"] = (defaults.placement ?? "bottom-start").split("-");
      return {
        side,
        align,
        sideOffset: defaults.gutter ?? 4,
        anchor: defaults.getAnchorRect
          ? {
              getBoundingClientRect: () =>
                defaults.getAnchorRect?.(handle.api.triggerElement()) ?? {
                  x: 0,
                  y: 0,
                  width: 0,
                  height: 0,
                },
            }
          : undefined,
      };
    },
    mergeProps(rest, {
      get class() {
        return cn(
          "z-50 z-dropdown-menu-content z-menu-target min-w-32 origin-(--transform-origin) overflow-hidden outline-none",
          local.class,
        );
      },
      get children() {
        return <ScrollArea viewportClass="max-h-(--available-height)">{local.children}</ScrollArea>;
      },
    }),
    "div",
  );
}

function DropdownMenuItem(
  props: ComponentProps<"div"> & {
    value?: string;
    disabled?: boolean;
    onSelect?: (event: Event) => unknown;
    closeOnSelect?: boolean;
    inset?: boolean;
    variant?: "default" | "destructive";
  },
) {
  const id = createUniqueId();
  const [local, rest] = splitProps(props, [
    "class",
    "value",
    "disabled",
    "onSelect",
    "closeOnSelect",
    "inset",
    "variant",
  ]);
  return usePart(
    menu,
    "item",
    () => ({
      id,
      value: local.value,
      disabled: local.disabled,
      onSelect: local.onSelect,
      closeOnSelect: local.closeOnSelect,
      destructive: local.variant === "destructive",
    }),
    mergeProps(rest, {
      get class() {
        return cn(
          "group/dropdown-menu-item relative z-dropdown-menu-item flex cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-inset:pl-8 data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          local.class,
        );
      },
      get "data-inset"() {
        return local.inset ? "" : undefined;
      },
      get "data-variant"() {
        return local.variant ?? "default";
      },
    }),
    "div",
  );
}

const DropdownMenuGroup = parts.Group;
const DropdownMenuSeparator = parts.Separator;
const DropdownMenuShortcut = parts.Shortcut;
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
};
