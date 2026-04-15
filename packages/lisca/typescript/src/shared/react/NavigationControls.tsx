import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "lisca/shared/ui";

import { SidebarField } from "./sidebar";

export type NavigationValue = number | string;

export type NavigationOption<T extends NavigationValue> = {
  label: string;
  value: T;
};

export function toNavigationOptions(values: number[]): NavigationOption<number>[] {
  return values.map((value) => ({ value, label: String(value) }));
}

export function findNavigationOptionIndex<T extends NavigationValue>(
  options: NavigationOption<T>[],
  value: T | null | undefined,
): number {
  if (options.length === 0) return -1;
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
}

export function stepNavigationValue<T extends NavigationValue>(
  options: NavigationOption<T>[],
  value: T | null | undefined,
  direction: -1 | 1,
): T | null {
  const index = findNavigationOptionIndex(options, value);
  if (index < 0) return null;
  const nextIndex = Math.min(options.length - 1, Math.max(0, index + direction));
  return options[nextIndex]?.value ?? null;
}

type SelectNavigationFieldProps<T extends NavigationValue> = {
  label: string;
  hint?: string;
  value: T;
  options: NavigationOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

type SliderNavigationFieldProps = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export type SelectNavigationControlProps<T extends NavigationValue> = Omit<SelectNavigationFieldProps<T>, "label">;

export type SliderNavigationControlProps = Omit<SliderNavigationFieldProps, "label">;

function StepperButtons({
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
}: {
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button size="sm" variant="outline" disabled={previousDisabled} onClick={onPrevious}>
        {"<"}
      </Button>
      <Button size="sm" variant="outline" disabled={nextDisabled} onClick={onNext}>
        {">"}
      </Button>
    </div>
  );
}

export function SelectStepperField<T extends NavigationValue>(props: SelectNavigationFieldProps<T>) {
  return (
    <SidebarField label={props.label} hint={props.hint}>
      <Select<T>
        value={props.value}
        onValueChange={(next: T | null) => next != null && props.onChange(next)}
        items={props.options}
        disabled={props.disabled}
        modal={false}
      >
        <SelectTrigger size="sm" className="text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={String(option.value)} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <StepperButtons
        previousDisabled={props.previousDisabled}
        nextDisabled={props.nextDisabled}
        onPrevious={props.onPrevious}
        onNext={props.onNext}
      />
    </SidebarField>
  );
}

export function SliderStepperField(props: SliderNavigationFieldProps) {
  return (
    <SidebarField label={props.label} hint={props.hint}>
      <Slider
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        disabled={props.disabled}
        onValueChange={props.onChange}
        onValueCommitted={props.onCommit}
      />
      <StepperButtons
        previousDisabled={props.previousDisabled}
        nextDisabled={props.nextDisabled}
        onPrevious={props.onPrevious}
        onNext={props.onNext}
      />
    </SidebarField>
  );
}

export function NavigationControls<T extends NavigationValue>({
  position,
  channel,
  timepoint,
  zPlane,
}: {
  position: SelectNavigationControlProps<T>;
  channel: SelectNavigationControlProps<T>;
  timepoint: SliderNavigationControlProps;
  zPlane: SliderNavigationControlProps;
}) {
  return (
    <>
      <SelectStepperField label="Position" {...position} />
      <SelectStepperField label="Channel" {...channel} />
      <SliderStepperField label="Timepoint" {...timepoint} />
      <SliderStepperField label="Z Plane" {...zPlane} />
    </>
  );
}
