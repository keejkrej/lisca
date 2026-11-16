import { popover, type PopoverOptions } from "@ui-sdk/core/popover";
import { createContext, splitProps, useContext, type ComponentProps, type JSX } from "solid-js";
import { createParts } from "../../lib/ui-sdk";
import { cn } from "../../lib/utils";

const parts = createParts(popover, {
  trigger: "button",
  content: "div",
  title: "h2",
  description: "p",
  close: "button",
  arrow: "div",
});

type Placement = "top" | "bottom" | "left" | "right";
type Position = { side: Placement; align: "start" | "center" | "end"; sideOffset: number };
const PositionContext = createContext<() => Position>((): Position => ({
  side: "bottom",
  align: "center",
  sideOffset: 4,
}));

export function Popover(
  props: PopoverOptions & {
    children?: JSX.Element;
    placement?: Placement | `${Placement}-start` | `${Placement}-end`;
    gutter?: number;
  },
) {
  const [local, rest] = splitProps(props, ["placement", "gutter", "children"]);
  const position = (): Position => {
    const [side, align] = (local.placement ?? "bottom").split("-");
    return {
      side: side as Placement,
      align: (align ?? "center") as Position["align"],
      sideOffset: local.gutter ?? 4,
    };
  };
  return (
    <parts.Root {...rest}>
      <PositionContext.Provider value={position}>{local.children}</PositionContext.Provider>
    </parts.Root>
  );
}

export const PopoverTrigger = parts.Trigger;
export const PopoverCloseButton = parts.Close;
export const PopoverArrow = parts.Arrow;

export function PopoverContent(props: ComponentProps<typeof parts.Content>) {
  const position = useContext(PositionContext);
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <parts.Content
      {...position()}
      class={cn("z-popover-content w-72 outline-none", local.class)}
      {...rest}
    />
  );
}

export function PopoverTitle(props: ComponentProps<typeof parts.Title>) {
  const [local, rest] = splitProps(props, ["class"]);
  return <parts.Title class={cn("z-font-heading z-popover-title", local.class)} {...rest} />;
}

export function PopoverDescription(props: ComponentProps<typeof parts.Description>) {
  const [local, rest] = splitProps(props, ["class"]);
  return <parts.Description class={cn("z-popover-description", local.class)} {...rest} />;
}

export function PopoverHeader(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["class"]);
  return <div data-slot="popover-header" class={cn("z-popover-header", local.class)} {...rest} />;
}
