"use client";

import {
  findNavigationOptionIndex,
  formatNavigationOptionDisplayLabel,
  stepNavigationValue,
  toNavigationOptions,
  type NavigationOption,
  type NavigationValue,
} from "@lisca/utils";
import { useSliderStepperField } from "@lisca/ui-headless/slider-stepper-field";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

export type { NavigationOption, NavigationValue };
export { findNavigationOptionIndex, stepNavigationValue, toNavigationOptions };

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
  valueLabel?: string;
  axisValues?: readonly number[];
  axisLabels?: readonly string[];
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
                {formatNavigationOptionDisplayLabel(option.label)}
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
  const { draftValue, setDraftValue, displayLabel, ariaValueText } = useSliderStepperField({
    value: props.value,
    axisValues: props.axisValues,
    axisLabels: props.axisLabels,
    valueLabel: props.valueLabel,
  });
  const commitValue = props.onCommit ?? props.onChange;

  return (
    <Field className="min-w-0 w-full">
      <FieldLabel className="w-full justify-between">
        <span>{props.label}</span>
        {displayLabel ? (
          <span className="font-normal text-muted-foreground">{displayLabel}</span>
        ) : null}
      </FieldLabel>
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
          aria-valuetext={ariaValueText}
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
  roi?: SelectNavigationControlProps<T>;
  className?: string;
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
        {roi ? <SelectStepperField label="ROI" {...roi} /> : null}
        {channel ? <SelectStepperField label="Channel" {...channel} /> : null}
        {timepoint ? <SliderStepperField label="Timepoint" {...timepoint} /> : null}
        {zPlane ? <SliderStepperField label="Z plane" {...zPlane} /> : null}
      </div>
    </Section>
  );
}
