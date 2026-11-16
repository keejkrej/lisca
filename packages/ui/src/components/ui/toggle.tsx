import { toggle, type ToggleGroupApi } from "@ui-sdk/core/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import {
  type ComponentProps,
  createContext,
  mergeProps,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";
import { cn } from "../../lib/utils";
import { usePart, usePrimitive } from "../../lib/ui-sdk";

export const ToggleBehaviorContext = createContext<ToggleGroupApi>();

const toggleVariants = cva(
  "group/toggle z-toggle inline-flex items-center justify-center whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "z-toggle-variant-default",
        outline: "z-toggle-variant-outline",
      },
      size: {
        default: "z-toggle-size-default",
        sm: "z-toggle-size-sm",
        lg: "z-toggle-size-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleProps<T extends ValidComponent = "button"> = Omit<ComponentProps<T>, "onChange"> &
  VariantProps<typeof toggleVariants> & {
    as?: T;
    pressed?: boolean;
    defaultPressed?: boolean;
    onChange?: (pressed: boolean) => void;
    value?: string;
    disabled?: boolean;
  };

const Toggle = <T extends ValidComponent = "button">(props: ToggleProps<T>) => {
  const group = useContext(ToggleBehaviorContext);
  const [local, others] = splitProps(props as ToggleProps, [
    "variant",
    "size",
    "class",
    "pressed",
    "defaultPressed",
    "onChange",
    "value",
    "disabled",
  ]);
  const handle = usePrimitive(toggle, () => ({
    pressed: local.pressed,
    defaultPressed: local.defaultPressed,
    onPressedChange: local.onChange,
    value: local.value,
    disabled: local.disabled,
    group: group ? () => group : undefined,
  }));
  return usePart(
    handle,
    "root",
    undefined,
    mergeProps(others, {
      get "data-pressed"() {
        return handle.state.pressed ? "" : undefined;
      },
      get class() {
        return cn(toggleVariants({ variant: local.variant, size: local.size }), local.class);
      },
    }),
    "button",
  );
};

export { Toggle, type ToggleProps, toggleVariants };
