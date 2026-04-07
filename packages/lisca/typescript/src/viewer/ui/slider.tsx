"use client";

import { Slider as SliderPrimitive } from "@base-ui/react";

import { cn } from "./utils";

type SliderValue = number | readonly number[];

interface SliderProps
  extends Omit<
    SliderPrimitive.Root.Props,
    "defaultValue" | "onValueChange" | "onValueCommitted" | "value"
  > {
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  value: number;
}

function coerceSliderValue(value: SliderValue) {
  return typeof value === "number" ? value : Number(value[0] ?? 0);
}

function Slider({
  className,
  defaultValue,
  onValueChange,
  onValueCommitted,
  value,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn("flex h-6 touch-none select-none items-center", className)}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(coerceSliderValue(next))}
      onValueCommitted={(next) => onValueCommitted?.(coerceSliderValue(next))}
      value={value}
      {...props}
    >
      <SliderPrimitive.Control className="relative h-1.5 w-full touch-none rounded-full bg-input">
        <SliderPrimitive.Track className="relative h-full rounded-full">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="absolute top-1/2 size-3 touch-none -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm outline-none ring-2 ring-background" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
