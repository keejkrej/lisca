import { Icon } from "@/components/ui/icon";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import * as TogglePrimitive from "@rn-primitives/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform } from "react-native";

const toggleVariants = cva(
  cn(
    "group shrink-0 flex-row items-center justify-center gap-2 rounded-lg border font-medium text-foreground",
    Platform.select({
      web: "hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex cursor-default whitespace-nowrap outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none",
    }),
  ),
  {
    variants: {
      variant: {
        default: "border-transparent",
        outline: cn(
          "border-input bg-background shadow-sm shadow-black/5 dark:bg-input/30",
          Platform.select({
            web: "hover:bg-input/64 dark:hover:bg-input/64",
          }),
        ),
      },
      size: {
        default: "h-9 min-w-9 px-2 sm:h-8 sm:min-w-8",
        sm: "h-8 min-w-8 px-1.5 sm:h-7 sm:min-w-7",
        lg: "h-10 min-w-10 px-2.5 sm:h-9 sm:min-w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TextClassContext.Provider
      value={cn(
        "text-center text-sm font-medium text-foreground",
        props.pressed
          ? "text-accent-foreground"
          : Platform.select({ web: "group-hover:text-muted-foreground" }),
      )}
    >
      <TogglePrimitive.Root
        className={cn(
          toggleVariants({ variant, size }),
          props.disabled && "pointer-events-none opacity-64",
          props.pressed && "bg-input shadow-none dark:bg-input",
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function ToggleIcon({ className, ...props }: React.ComponentProps<typeof Icon>) {
  const textClass = React.useContext(TextClassContext);
  return <Icon className={cn("size-4 shrink-0", textClass, className)} {...props} />;
}

export { Toggle, ToggleIcon, toggleVariants };
