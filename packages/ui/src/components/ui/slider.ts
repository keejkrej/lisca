import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";
import { Slider as KitSlider } from "@effect/ui-kit";

import { cn } from "../../lib/utils";

export type SliderOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly class?: string | undefined;
  readonly controlClass?: string | undefined;
  readonly header?: View.Content<M, R> | undefined;
  readonly value: number;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly step?: number | undefined;
  readonly largeStep?: number | undefined;
  readonly disabled?: boolean | undefined;
  readonly orientation?: "horizontal" | "vertical" | undefined;
  readonly name?: string | undefined;
  readonly id?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly ariaLabelledby?: string | undefined;
  readonly ariaDescribedby?: string | undefined;
  readonly ariaValuetext?: string | undefined;
  readonly onValueChange?: ((value: number) => M | undefined) | undefined;
  readonly onValueCommitted?: ((value: number) => M | undefined) | undefined;
};

export function Slider<M, R = never>(h: Html.H<M>, options: SliderOptions<M, R>) {
  const safeMin = options.min ?? 0;
  const safeMax = Math.max(options.max ?? 100, safeMin + 1);
  const clampedValue = Math.min(Math.max(options.value, safeMin), safeMax);

  return KitSlider(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      value: clampedValue,
      min: safeMin,
      max: safeMax,
      ...(options.step !== undefined ? { step: options.step } : {}),
      ...(options.largeStep !== undefined ? { largeStep: options.largeStep } : {}),
      ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
      ...(options.orientation !== undefined ? { orientation: options.orientation } : {}),
    },
    onEmit: {
      Moved: ({ value }) => {
        const next = Array.isArray(value) ? (value[0] ?? safeMin) : value;
        return options.onValueChange?.(next);
      },
      Committed: ({ value }) => {
        const next = Array.isArray(value) ? (value[0] ?? safeMin) : value;
        return options.onValueCommitted?.(next);
      },
    },
    view: (slider) => {
      let input = h.input;
      if (options.name !== undefined) input = input.attr("name", options.name);
      if (options.ariaLabel !== undefined) input = input.attr("aria-label", options.ariaLabel);
      if (options.ariaLabelledby !== undefined) {
        input = input.attr("aria-labelledby", options.ariaLabelledby);
      }
      if (options.ariaDescribedby !== undefined) {
        input = input.attr("aria-describedby", options.ariaDescribedby);
      }
      if (options.ariaValuetext !== undefined) {
        input = input.attr("aria-valuetext", options.ariaValuetext);
      }

      let root = slider
        .root(h.div)
        .attr("data-slot", "slider")
        .class(cn("data-[orientation=horizontal]:w-full", options.class));

      if (options.id !== undefined) {
        root = root.attr("id", options.id);
      }

      return root.children(
        options.header,
        slider
          .control(h.div)
          .attr("data-slot", "slider-control")
          .class(
            cn(
              "flex items-center touch-none select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:min-w-44 data-[orientation=vertical]:flex-col data-disabled:pointer-events-none data-disabled:opacity-64",
              options.controlClass,
            ),
          )
          .children(
            slider
              .track(h.div)
              .attr("data-slot", "slider-track")
              .class(
                "relative grow select-none before:absolute before:rounded-none before:bg-input data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1 data-[orientation=horizontal]:mx-2.5 data-[orientation=horizontal]:sm:mx-2 data-[orientation=horizontal]:before:inset-x-0.5 data-[orientation=vertical]:before:inset-x-0 data-[orientation=horizontal]:before:inset-y-0 data-[orientation=vertical]:before:inset-y-0.5",
              )
              .children(
                slider
                  .indicator(h.div)
                  .attr("data-slot", "slider-indicator")
                  .class(
                    "absolute select-none rounded-none bg-primary data-[orientation=horizontal]:inset-y-0 data-[orientation=horizontal]:left-[var(--slider-indicator-start)] data-[orientation=horizontal]:w-[var(--slider-indicator-size)] data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:bottom-[var(--slider-indicator-start)] data-[orientation=vertical]:h-[var(--slider-indicator-size)]",
                  ),
                slider.thumb({
                  element: h.div
                    .attr("data-slot", "slider-thumb")
                    .class(
                      "absolute block size-4 shrink-0 select-none rounded-none border border-input bg-white not-dark:bg-clip-padding shadow-xs/5 outline-none transition-[box-shadow,scale] before:absolute before:inset-0 before:rounded-none before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 data-dragging:scale-120 dark:border-background dark:has-focus-visible:ring-ring/48 [:has(*:focus-visible),[data-dragging]]:shadow-none data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-[var(--slider-thumb-position)] data-[orientation=horizontal]:-translate-x-1/2 data-[orientation=horizontal]:-translate-y-1/2 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:bottom-[var(--slider-thumb-position)] data-[orientation=vertical]:-translate-x-1/2 data-[orientation=vertical]:translate-y-1/2",
                    ),
                  input,
                }),
              ),
          ),
      );
    },
  });
}

export { KitSlider };
