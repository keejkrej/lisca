import { Field, FieldLabel } from "../../components/ui/field";
import { Slider } from "../../components/ui/slider";

export function AnnotationToolSlider(props: {
  label: string;
  value: number;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field class="min-w-0 w-full">
      <FieldLabel class="w-full justify-between gap-2">
        <span>{props.label}</span>
        <span class="font-normal tabular-nums text-muted-foreground">{props.valueLabel}</span>
      </FieldLabel>
      <Slider
        aria-label={props.label}
        class="w-full pt-0.5"
        max={props.max}
        min={props.min}
        step={props.step}
        value={props.value}
        onValueChange={props.onChange}
      />
    </Field>
  );
}
