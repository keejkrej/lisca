"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";

import { cn } from "../../lib/utils";

type SliderInputValue = number | readonly number[];

interface SliderProps extends Omit<
  SliderPrimitive.Root.Props,
  "defaultValue" | "onValueChange" | "onValueCommitted" | "value"
> {
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  value: number;
}

function coerceSliderValue(value: SliderInputValue) {
  return typeof value === "number" ? value : Number(value[0] ?? 0);
}

function Slider({
  className,
  children,
  defaultValue,
  onValueChange,
  onValueCommitted,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderProps): React.ReactElement {
  const safeMin = min;
  const safeMax = max > min ? max : min + 1;
  const clampedValue = Math.min(Math.max(value, safeMin), safeMax);

  const values = React.useMemo(() => [clampedValue], [clampedValue]);

  return (
    <SliderPrimitive.Root
      className={cn("data-[orientation=horizontal]:w-full", className)}
      defaultValue={defaultValue}
      max={safeMax}
      min={safeMin}
      onValueChange={(next) => onValueChange?.(coerceSliderValue(next))}
      onValueCommitted={(next) => onValueCommitted?.(coerceSliderValue(next))}
      thumbAlignment="edge"
      value={clampedValue}
      {...props}
    >
      {children}
      <SliderPrimitive.Control
        className="flex touch-none select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:min-w-44 data-[orientation=vertical]:flex-col data-disabled:pointer-events-none data-disabled:opacity-64"
        data-slot="slider-control"
      >
        <SliderPrimitive.Track
          className="relative grow select-none before:absolute before:rounded-full before:bg-input data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1 data-[orientation=horizontal]:before:inset-x-0.5 data-[orientation=vertical]:before:inset-x-0 data-[orientation=horizontal]:before:inset-y-0 data-[orientation=vertical]:before:inset-y-0.5"
          data-slot="slider-track"
        >
          <SliderPrimitive.Indicator
            className="select-none rounded-full bg-primary data-[orientation=horizontal]:ms-0.5 data-[orientation=vertical]:mb-0.5"
            data-slot="slider-indicator"
          />
          {Array.from({ length: values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              className="block size-5 shrink-0 select-none rounded-full border border-input bg-white not-dark:bg-clip-padding shadow-xs/5 outline-none transition-[box-shadow,scale] before:absolute before:inset-0 before:rounded-full before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 data-dragging:scale-120 sm:size-4 dark:border-background dark:has-focus-visible:ring-ring/48 [:has(*:focus-visible),[data-dragging]]:shadow-none"
              data-slot="slider-thumb"
              index={index}
              key={index}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

function SliderValue({ className, ...props }: SliderPrimitive.Value.Props): React.ReactElement {
  return (
    <SliderPrimitive.Value
      className={cn("flex justify-end text-sm", className)}
      data-slot="slider-value"
      {...props}
    />
  );
}

export { Slider, SliderPrimitive, SliderValue };
