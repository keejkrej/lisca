import { Icon } from "@/components/ui/icon";
import { TextClassContext } from "@/components/ui/text";
import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import * as ToggleGroupPrimitive from "@rn-primitives/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform } from "react-native";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants> | null>(null);

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(
        "flex w-full flex-row items-center",
        variant === "default" ? "gap-0.5" : "shadow-none",
        variant === "outline" && "shadow-sm shadow-black/5",
        Platform.select({ web: "w-fit" }),
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function useToggleGroupContext() {
  const context = React.useContext(ToggleGroupContext);
  if (context === null) {
    throw new Error(
      "ToggleGroup compound components cannot be rendered outside the ToggleGroup component",
    );
  }
  return context;
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  isFirst,
  isLast,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants> & {
    isFirst?: boolean;
    isLast?: boolean;
  }) {
  const context = useToggleGroupContext();
  const { value } = ToggleGroupPrimitive.useRootContext();
  const resolvedVariant = context.variant || variant;
  const isSelected = ToggleGroupPrimitive.utils.getIsSelected(value, props.value);

  return (
    <TextClassContext.Provider
      value={cn(
        "text-sm font-medium text-foreground",
        isSelected
          ? "text-accent-foreground"
          : Platform.select({ web: "group-hover:text-muted-foreground" }),
      )}
    >
      <ToggleGroupPrimitive.Item
        className={cn(
          toggleVariants({
            variant: resolvedVariant,
            size: context.size || size,
          }),
          props.disabled && "pointer-events-none opacity-64",
          isSelected && "bg-input shadow-none dark:bg-input",
          "min-w-0 shrink-0 shadow-none",
          resolvedVariant === "outline" && [
            "rounded-none",
            isFirst && "rounded-l-lg",
            isLast && "rounded-r-lg",
            !isFirst && "border-l-0",
          ],
          Platform.select({
            web: "flex-1 focus:z-10 focus-visible:z-10",
          }),
          className,
        )}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive.Item>
    </TextClassContext.Provider>
  );
}

function ToggleGroupIcon({ className, ...props }: React.ComponentProps<typeof Icon>) {
  const textClass = React.useContext(TextClassContext);
  return <Icon className={cn("size-4 shrink-0", textClass, className)} {...props} />;
}

export { ToggleGroup, ToggleGroupIcon, ToggleGroupItem };
