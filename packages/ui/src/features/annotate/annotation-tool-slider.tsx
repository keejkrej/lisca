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
    <div class="flex min-h-0 w-full min-w-0 flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <span class="min-w-0 text-xs font-medium leading-4 text-muted-foreground">
          {props.label}
        </span>
        <span class="text-xs text-muted-foreground/80 tabular-nums">{props.valueLabel}</span>
      </div>
      <Slider
        aria-label={props.label}
        class="w-full pt-0.5"
        max={props.max}
        min={props.min}
        step={props.step}
        value={props.value}
        onValueChange={props.onChange}
      />
    </div>
  );
}
