"use client";

import type * as React from "react";
import { createContext, useContext, useMemo } from "react";

import { Button } from "./button";
import { cn } from "./utils";

type ToggleGroupContextValue<T extends string> = {
  disabled?: boolean;
  value: readonly T[];
  onValueChange?: (value: T[]) => void;
  multiple: boolean;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue<string> | null>(null);

interface ToggleGroupProps<T extends string> {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  onValueChange?: (value: T[]) => void;
  value: readonly T[];
}

function ToggleGroup<T extends string>({
  children,
  className,
  disabled,
  multiple = true,
  onValueChange,
  value,
}: ToggleGroupProps<T>) {
  const contextValue = useMemo<ToggleGroupContextValue<T>>(
    () => ({
      disabled,
      multiple,
      onValueChange,
      value,
    }),
    [disabled, multiple, onValueChange, value],
  );

  return (
    <ToggleGroupContext.Provider value={contextValue as unknown as ToggleGroupContextValue<string>}>
      <div
        className={cn(
          "flex flex-row flex-nowrap items-center gap-1 rounded-xl border border-border bg-muted/35 p-1",
          className,
        )}
        role="group"
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

interface ToggleGroupItemProps<T extends string> {
  "aria-label"?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  value: T;
}

function ToggleGroupItem<T extends string>({
  children,
  className,
  disabled,
  value,
  ...props
}: ToggleGroupItemProps<T>) {
  const context = useContext(ToggleGroupContext);
  if (!context) {
    throw new Error("ToggleGroupItem must be used within ToggleGroup");
  }

  const active = context.value.includes(value);
  const isDisabled = Boolean(context.disabled || disabled);

  return (
    <Button
      {...props}
      size="sm"
      type="button"
      variant={active ? "default" : "ghost"}
      className={cn("min-w-[4.5rem]", className)}
      disabled={isDisabled}
      aria-pressed={active}
      onClick={() => {
        if (isDisabled) return;
        if (context.multiple) {
          const next = active
            ? context.value.filter((entry) => entry !== value)
            : [...context.value, value];
          context.onValueChange?.(next as T[]);
          return;
        }
        context.onValueChange?.((active ? context.value : [value]) as T[]);
      }}
    >
      {children}
    </Button>
  );
}

export { ToggleGroup, ToggleGroupItem };
