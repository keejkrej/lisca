import type { Html } from "@effect/ui/html";
import { Field, FieldLabel } from "@lisca/ui/field";
import { Slider } from "@lisca/ui/slider";

export type AnnotationToolSliderOptions<M> = {
  readonly key?: string | undefined;
  readonly label: string;
  readonly value: number;
  readonly valueLabel: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => M;
};

export type AnnotationToolSliderProps<M = never> = AnnotationToolSliderOptions<M>;

export function AnnotationToolSlider<M>(h: Html.H<M>, options: AnnotationToolSliderOptions<M>) {
  return Field(h, { class: "min-w-0 w-full" }).children(
    FieldLabel(h, { class: "w-full justify-between gap-2" }).children(
      h.span.children(options.label),
      h.span.class("font-normal tabular-nums text-muted-foreground").children(options.valueLabel),
    ),
    Slider(h, {
      ...(options.key !== undefined ? { key: options.key } : {}),
      ariaLabel: options.label,
      class: "w-full pt-0.5",
      max: options.max,
      min: options.min,
      step: options.step,
      value: options.value,
      onValueChange: options.onChange,
    }),
  );
}
