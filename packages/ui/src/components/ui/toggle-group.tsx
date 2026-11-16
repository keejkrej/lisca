import { toggleGroup } from "@ui-sdk/core/toggle";
import type { VariantProps } from "class-variance-authority";
import {
  type ComponentProps,
  createContext,
  type JSX,
  mergeProps,
  splitProps,
  useContext,
} from "solid-js";
import { cn } from "../../lib/utils";
import { usePart, usePrimitive } from "../../lib/ui-sdk";
import { Toggle, ToggleBehaviorContext, toggleVariants, type ToggleProps } from "./toggle";

type ToggleGroupStyle = VariantProps<typeof toggleVariants> & { spacing?: number };
const ToggleGroupStyleContext = createContext<ToggleGroupStyle>({});

type ToggleGroupProps = Omit<ComponentProps<"div">, "onChange"> &
  ToggleGroupStyle & {
    value?: string | string[];
    defaultValue?: string | string[];
    onChange?: (value: string | string[]) => void;
    multiple?: boolean;
    disabled?: boolean;
    orientation?: "horizontal" | "vertical";
    loop?: boolean;
  };

const values = (value: string | string[] | undefined) =>
  value === undefined ? undefined : Array.isArray(value) ? value : value ? [value] : [];

function ToggleGroup(props: ToggleGroupProps) {
  const [local, rest] = splitProps(props, [
    "value",
    "defaultValue",
    "onChange",
    "multiple",
    "disabled",
    "orientation",
    "loop",
    "variant",
    "size",
    "spacing",
    "class",
    "children",
  ]);
  const handle = usePrimitive(toggleGroup, () => ({
    value: values(local.value),
    defaultValue: values(local.defaultValue),
    multiple: local.multiple,
    disabled: local.disabled,
    orientation: local.orientation,
    loop: local.loop,
    onValueChange: (next) => local.onChange?.(local.multiple ? next : (next[0] ?? "")),
  }));
  return (
    <ToggleBehaviorContext.Provider value={handle.api}>
      <ToggleGroupStyleContext.Provider value={local}>
        {usePart(
          handle,
          "group",
          undefined,
          mergeProps(rest, {
            get "data-variant"() {
              return local.variant;
            },
            get "data-size"() {
              return local.size;
            },
            get "data-spacing"() {
              return local.spacing ?? 0;
            },
            get style() {
              return { "--gap": local.spacing ?? 0 } as JSX.CSSProperties;
            },
            get class() {
              return cn(
                "group/toggle-group z-toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
                local.class,
              );
            },
            get children() {
              return local.children;
            },
          }),
          "div",
        )}
      </ToggleGroupStyleContext.Provider>
    </ToggleBehaviorContext.Provider>
  );
}

function ToggleGroupItem(props: ToggleProps & { value: string }) {
  const context = useContext(ToggleGroupStyleContext);
  const [local, rest] = splitProps(props, ["class", "variant", "size"]);
  return (
    <Toggle
      {...rest}
      variant={context.variant ?? local.variant}
      size={context.size ?? local.size}
      data-lisca-slot="toggle-group-item"
      data-variant={context.variant ?? local.variant}
      data-size={context.size ?? local.size}
      data-spacing={context.spacing ?? 0}
      class={cn(
        "z-toggle-group-item shrink-0 focus:z-10 focus-visible:z-10 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l",
        local.class,
      )}
    />
  );
}

export { ToggleGroup, ToggleGroupItem, type ToggleGroupProps };
