import {
  tooltip,
  type TooltipOptions,
  type TooltipContentProps as SdkTooltipContentProps,
} from "@ui-sdk/core/tooltip";
import {
  createContext,
  createUniqueId,
  mergeProps,
  splitProps,
  useContext,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { providePrimitive, usePart, usePrimitive } from "../../lib/ui-sdk";
import { cn } from "../../lib/utils";

type Placement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "left-start"
  | "left-end"
  | "right-start"
  | "right-end";
type TooltipProps = TooltipOptions & {
  children?: JSX.Element;
  placement?: Placement;
  openDelay?: number;
  gutter?: number;
};
const TooltipPositionContext = createContext<{ placement?: Placement; gutter?: number }>({});

function Tooltip(props: TooltipProps) {
  const handle = usePrimitive(tooltip, () => ({
    open: props.open,
    defaultOpen: props.defaultOpen,
    onOpenChange: props.onOpenChange,
    delay: props.openDelay ?? props.delay,
    closeDelay: props.closeDelay,
    disabled: props.disabled,
    closeOnPress: props.closeOnPress,
    toggleable: props.toggleable,
    type: props.type,
  }));
  return providePrimitive(handle, () => (
    <TooltipPositionContext.Provider value={props}>
      {props.children}
    </TooltipPositionContext.Provider>
  ));
}

type TooltipTriggerProps<T extends ValidComponent = "button"> = ComponentProps<T> & {
  as?: T;
  delay?: number;
};
function TooltipTrigger<T extends ValidComponent = "button">(props: TooltipTriggerProps<T>) {
  const id = createUniqueId();
  const [, rest] = splitProps(props as TooltipTriggerProps, ["delay"]);
  return usePart(tooltip, "trigger", () => ({ id }), rest, "button");
}

type TooltipContentProps = ComponentProps<"div"> & SdkTooltipContentProps;
function TooltipContent(props: TooltipContentProps) {
  const defaults = useContext(TooltipPositionContext);
  const [local, rest] = splitProps(props, [
    "class",
    "children",
    "side",
    "align",
    "sideOffset",
    "alignOffset",
    "collisionPadding",
    "arrowPadding",
    "anchor",
  ]);
  return usePart(
    tooltip,
    "content",
    () => {
      const [side = "top", align = "center"] = (defaults.placement ?? "top").split("-");
      return {
        side: local.side ?? side,
        align: local.align ?? align,
        sideOffset: local.sideOffset ?? defaults.gutter ?? 4,
        alignOffset: local.alignOffset,
        collisionPadding: local.collisionPadding,
        arrowPadding: local.arrowPadding,
        anchor: local.anchor,
      };
    },
    mergeProps(rest, {
      get class() {
        return cn(
          "z-50 z-tooltip-content w-fit max-w-xs origin-(--transform-origin) bg-foreground text-background",
          local.class,
        );
      },
      get children() {
        return (
          <>
            {local.children}
            {usePart(
              tooltip,
              "arrow",
              undefined,
              { class: "z-tooltip-arrow size-2.5 rotate-45 bg-foreground" },
              "div",
            )}
          </>
        );
      },
    }),
    "div",
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipContentProps,
};
