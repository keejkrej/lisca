"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Field, FieldLabel } from "../../components/ui/field";
import { Slider } from "../../components/ui/slider";
import { Section } from "../../shell/regions/section";

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
  value: number;
  min: number;
  max: number;
  step: number;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export type SelectNavigationControlProps<T extends NavigationValue> = Omit<
  SelectNavigationFieldProps<T>,
  "label"
>;

export type SliderNavigationControlProps = Omit<SliderNavigationFieldProps, "label">;

export function SelectStepperField<T extends NavigationValue>(
  props: SelectNavigationFieldProps<T>,
) {
  return (
    <Field className="min-w-0 w-full">
      <FieldLabel>{props.label}</FieldLabel>
      <div className="grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] gap-2">
        <Button
          aria-label={`Previous ${props.label}`}
          className="h-8 w-full px-0 text-xs"
          disabled={props.previousDisabled}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onPrevious}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Select<T>
          disabled={props.disabled}
          items={props.options}
          modal={false}
          value={props.value}
          onValueChange={(next) => next != null && props.onChange(next)}
        >
          <SelectTrigger size="sm" className="min-w-0 text-sm">
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
        <Button
          aria-label={`Next ${props.label}`}
          className="h-8 w-full px-0 text-xs"
          disabled={props.nextDisabled}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onNext}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </Field>
  );
}

export function SliderStepperField(props: SliderNavigationFieldProps) {
  const [draftValue, setDraftValue] = useState(props.value);

  useEffect(() => {
    setDraftValue(props.value);
  }, [props.value]);

  const commitValue = props.onCommit ?? props.onChange;

  return (
    <Field className="min-w-0 w-full">
      <FieldLabel>{props.label}</FieldLabel>
      <div className="grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2">
        <Button
          aria-label={`Previous ${props.label}`}
          className="h-8 w-full px-0 text-xs"
          disabled={props.previousDisabled}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onPrevious}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Slider
          controlClassName="data-[orientation=horizontal]:!min-w-0"
          disabled={props.disabled}
          max={props.max}
          min={props.min}
          step={props.step}
          value={draftValue}
          onValueChange={setDraftValue}
          onValueCommitted={(value) => {
            setDraftValue(value);
            commitValue?.(value);
          }}
        />
        <Button
          aria-label={`Next ${props.label}`}
          className="h-8 w-full px-0 text-xs"
          disabled={props.nextDisabled}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onNext}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </Field>
  );
}

export type FrameNavigationProps<T extends NavigationValue> = {
  position?: SelectNavigationControlProps<T>;
  channel?: SelectNavigationControlProps<T>;
  timepoint?: SliderNavigationControlProps;
  zPlane?: SliderNavigationControlProps;
  /** ROI / tile index stepper (e.g. inspect mode). */
  roi?: SelectNavigationControlProps<T>;
  /** Inner controls wrapper class (layout of fields). */
  className?: string;
  /** Section card title (default: Navigation). */
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
};

/** Shared stack in a {@link Section} card: optional position, channel, time (slider), Z (slider), ROI — render only props you pass. */
export function FrameNavigation<T extends NavigationValue>(props: FrameNavigationProps<T>) {
  const {
    position,
    channel,
    timepoint,
    zPlane,
    roi,
    className,
    sectionTitle = "Navigation",
    sectionDescription,
    sectionClassName,
    sectionContentClassName,
  } = props;
  return (
    <Section
      contentClassName={sectionContentClassName}
      description={sectionDescription}
      title={sectionTitle}
      className={sectionClassName}
    >
      <div className={className ?? "min-w-0 space-y-3"}>
        {position ? <SelectStepperField label="Position" {...position} /> : null}
        {channel ? <SelectStepperField label="Channel" {...channel} /> : null}
        {timepoint ? <SliderStepperField label="Timepoint" {...timepoint} /> : null}
        {zPlane ? <SliderStepperField label="Z plane" {...zPlane} /> : null}
        {roi ? <SelectStepperField label="ROI" {...roi} /> : null}
      </div>
    </Section>
  );
}
