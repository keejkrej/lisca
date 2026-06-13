import {
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
  type NavigationOption,
  type NavigationValue,
} from "@lisca/utils";
import { useSliderStepperField } from "@lisca/ui-headless/slider-stepper-field";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { View } from "react-native";

import { Icon } from "../../../components/ui/icon";
import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
import { Field, FieldLabel } from "../../../components/ui/field";
import { Slider } from "../../../components/ui/slider";
import { cn } from "../../../lib/utils";
import { Section } from "../../shell/regions/section";
import { SelectPicker } from "./select-picker";

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
  step?: number;
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

function SelectStepperField<T extends NavigationValue>(props: SelectNavigationFieldProps<T>) {
  return (
    <Field className="min-w-0 w-full">
      <FieldLabel>{props.label}</FieldLabel>
      <View className="grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2">
        <Button
          accessibilityLabel={`Previous ${props.label}`}
          className="h-8 w-full px-0"
          disabled={props.previousDisabled || props.disabled}
          size="sm"
          variant="outline"
          onPress={props.onPrevious}
        >
          <Icon as={ChevronLeft} className="size-4" size={16} strokeWidth={2} />
        </Button>
        <SelectPicker
          disabled={props.disabled}
          options={props.options}
          value={props.value}
          onChange={props.onChange}
        />
        <Button
          accessibilityLabel={`Next ${props.label}`}
          className="h-8 w-full px-0"
          disabled={props.nextDisabled || props.disabled}
          size="sm"
          variant="outline"
          onPress={props.onNext}
        >
          <Icon as={ChevronRight} className="size-4" size={16} strokeWidth={2} />
        </Button>
      </View>
    </Field>
  );
}

function SliderStepperField(props: SliderNavigationFieldProps) {
  const { draftValue, setDraftValue, displayLabel, ariaValueText } = useSliderStepperField({
    value: props.value,
    axisValues: props.axisValues,
    axisLabels: props.axisLabels,
    valueLabel: props.valueLabel,
  });
  const commitValue = props.onCommit ?? props.onChange;

  return (
    <Field className="min-w-0 w-full">
      <FieldLabel className="w-full flex-row items-center justify-between">
        {props.label}
        {displayLabel ? (
          <Text className="font-normal text-muted-foreground text-sm">{displayLabel}</Text>
        ) : null}
      </FieldLabel>
      <View className="grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2">
        <Button
          accessibilityLabel={`Previous ${props.label}`}
          className="h-8 w-full px-0"
          disabled={props.previousDisabled || props.disabled}
          size="sm"
          variant="outline"
          onPress={props.onPrevious}
        >
          <Icon as={ChevronLeft} className="size-4" size={16} strokeWidth={2} />
        </Button>
        <View
          accessibilityLabel={ariaValueText}
          accessibilityRole="adjustable"
          className="min-w-0 w-full"
        >
          <Slider
            disabled={props.disabled}
            maximumValue={props.max}
            minimumValue={props.min}
            step={props.step ?? 1}
            style={{ width: "100%" }}
            value={draftValue}
            onSlidingComplete={(value) => {
              setDraftValue(value);
              commitValue?.(value);
            }}
            onValueChange={setDraftValue}
          />
        </View>
        <Button
          accessibilityLabel={`Next ${props.label}`}
          className="h-8 w-full px-0"
          disabled={props.nextDisabled || props.disabled}
          size="sm"
          variant="outline"
          onPress={props.onNext}
        >
          <Icon as={ChevronRight} className="size-4" size={16} strokeWidth={2} />
        </Button>
      </View>
    </Field>
  );
}

export type FrameNavigationProps<T extends NavigationValue = number> = {
  position?: SelectNavigationControlProps<T>;
  channel?: SelectNavigationControlProps<T>;
  timepoint?: SliderNavigationControlProps;
  zPlane?: SliderNavigationControlProps;
  roi?: SelectNavigationControlProps<T>;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
  sectionClassName?: string;
  sectionContentClassName?: string;
};

export function FrameNavigation<T extends NavigationValue = number>(
  props: FrameNavigationProps<T>,
) {
  const {
    position,
    channel,
    timepoint,
    zPlane,
    roi,
    sectionTitle = "Navigation",
    sectionDescription,
    sectionStyle,
    sectionContentStyle,
    sectionClassName,
    sectionContentClassName,
  } = props;

  return (
    <Section
      className={sectionClassName}
      contentClassName={cn("gap-3", sectionContentClassName)}
      contentStyle={sectionContentStyle}
      description={sectionDescription}
      style={sectionStyle}
      title={sectionTitle}
    >
      {position ? <SelectStepperField label="Position" {...position} /> : null}
      {channel ? <SelectStepperField label="Channel" {...channel} /> : null}
      {timepoint ? <SliderStepperField label="Timepoint" {...timepoint} /> : null}
      {zPlane ? <SliderStepperField label="Z plane" {...zPlane} /> : null}
      {roi ? <SelectStepperField label="ROI" {...roi} /> : null}
    </Section>
  );
}
