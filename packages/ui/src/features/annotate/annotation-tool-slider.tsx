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
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-xs font-medium text-muted-foreground leading-tight">
          {props.label}
        </span>
        <span className="text-xs text-muted-foreground/80 tabular-nums">{props.valueLabel}</span>
      </div>
      <Slider
        className="w-full pt-0.5"
        max={props.max}
        min={props.min}
        step={props.step}
        value={props.value}
        onValueChange={props.onChange}
      />
    </div>
  );
}
