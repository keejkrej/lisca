import { Slider as KobalteSlider } from "@kobalte/core/slider";
import { splitProps, type JSX } from "solid-js";

import { cn } from "../../lib/utils";

export function Slider(props: {
  class?: string;
  controlClassName?: string;
  children?: JSX.Element;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  step?: number;
  name?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-valuetext"?: string;
}): JSX.Element {
  const [local, rest] = splitProps(props, [
    "class",
    "controlClassName",
    "children",
    "defaultValue",
    "onValueChange",
    "onValueCommitted",
    "value",
    "min",
    "max",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-valuetext",
  ]);

  const safeMin = () => local.min ?? 0;
  const safeMax = () => {
    const min = safeMin();
    const max = local.max ?? 100;
    return max > min ? max : min + 1;
  };
  const clampedValue = () => Math.min(Math.max(local.value, safeMin()), safeMax());

  return (
    <KobalteSlider
      class={cn("data-[orientation=horizontal]:w-full", local.class)}
      defaultValue={local.defaultValue == null ? undefined : [local.defaultValue]}
      maxValue={safeMax()}
      minValue={safeMin()}
      getValueLabel={
        local["aria-valuetext"] == null ? undefined : () => local["aria-valuetext"] ?? ""
      }
      onChange={(next) => local.onValueChange?.(next[0] ?? 0)}
      onChangeEnd={(next) => local.onValueCommitted?.(next[0] ?? 0)}
      value={[clampedValue()]}
      {...rest}
    >
      {local.children}
      <div
        class={cn(
          "flex items-center touch-none select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:min-w-44 data-[orientation=vertical]:flex-col data-disabled:pointer-events-none data-disabled:opacity-64",
          local.controlClassName,
        )}
        data-slot="slider-control"
      >
        <KobalteSlider.Track
          class="relative grow select-none before:absolute before:rounded-full before:bg-input data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1 data-[orientation=horizontal]:mx-2.5 data-[orientation=horizontal]:sm:mx-2 data-[orientation=horizontal]:before:inset-x-0.5 data-[orientation=vertical]:before:inset-x-0 data-[orientation=horizontal]:before:inset-y-0 data-[orientation=vertical]:before:inset-y-0.5"
          data-slot="slider-track"
        >
          <KobalteSlider.Fill
            class="select-none rounded-full bg-primary data-[orientation=horizontal]:ms-0.5 data-[orientation=vertical]:mb-0.5"
            data-slot="slider-indicator"
          />
          <KobalteSlider.Thumb
            aria-describedby={local["aria-describedby"]}
            aria-label={local["aria-label"]}
            aria-labelledby={local["aria-labelledby"]}
            class="block size-4 shrink-0 select-none rounded-full border border-input bg-white not-dark:bg-clip-padding shadow-xs/5 outline-none transition-[box-shadow,scale] before:absolute before:inset-0 before:rounded-full before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 data-dragging:scale-120 dark:border-background dark:has-focus-visible:ring-ring/48 [:has(*:focus-visible),[data-dragging]]:shadow-none data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:-mt-2 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:-ml-2"
            data-slot="slider-thumb"
          />
        </KobalteSlider.Track>
      </div>
    </KobalteSlider>
  );
}

export function SliderValue(props: { class?: string }): JSX.Element {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <KobalteSlider.ValueLabel
      class={cn("flex justify-end text-sm", local.class)}
      data-slot="slider-value"
      {...rest}
    />
  );
}

export { KobalteSlider as SliderPrimitive };
