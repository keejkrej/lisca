import {
  findNavigationOptionIndex,
  formatNavigationOptionDisplayLabel,
  stepNavigationValue,
  toNavigationOptions,
  type NavigationOption,
  type NavigationValue,
} from "@lisca/utils";
import { useSliderStepperField } from "@lisca/ui-headless/slider-stepper-field";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";
import { Button } from "../../shell/chrome/buttons";
import { Field } from "../../shell/chrome/field";
import { Section } from "../../shell/regions/section";
import { Slider } from "../../shell/chrome/slider";
import { useThemeColors } from "../../theme/use-theme-colors";

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

function SelectPicker<T extends NavigationValue>(props: {
  value: T;
  options: NavigationOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = props.options.find((option) => option.value === props.value);

  return (
    <>
      <Pressable
        className={cn(
          "min-h-8 justify-center rounded-lg border border-input bg-background px-2.5 py-2",
          props.disabled && "opacity-60",
        )}
        disabled={props.disabled}
        onPress={() => setOpen(true)}
      >
        <Text className="text-sm" numberOfLines={1}>
          {selected ? formatNavigationOptionDisplayLabel(selected.label) : String(props.value)}
        </Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/35 p-6" onPress={() => setOpen(false)}>
          <Pressable className="max-h-80 overflow-hidden rounded-xl border border-border bg-popover">
            <ScrollView>
              {props.options.map((option) => (
                <Pressable
                  key={String(option.value)}
                  className={cn(
                    "px-4 py-3",
                    option.value === props.value && "bg-accent",
                  )}
                  onPress={() => {
                    props.onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text>{formatNavigationOptionDisplayLabel(option.label)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SelectStepperField<T extends NavigationValue>(props: SelectNavigationFieldProps<T>) {
  return (
    <Field label={props.label}>
      <View className="flex-row items-center gap-2">
        <Button
          className="h-8 w-8 min-w-8 px-0"
          compact
          disabled={props.previousDisabled || props.disabled}
          label="‹"
          size="sm"
          variant="outline"
          onPress={props.onPrevious}
        />
        <View className="min-w-0 flex-1">
          <SelectPicker
            disabled={props.disabled}
            options={props.options}
            value={props.value}
            onChange={props.onChange}
          />
        </View>
        <Button
          className="h-8 w-8 min-w-8 px-0"
          compact
          disabled={props.nextDisabled || props.disabled}
          label="›"
          size="sm"
          variant="outline"
          onPress={props.onNext}
        />
      </View>
    </Field>
  );
}

function SliderStepperField(props: SliderNavigationFieldProps) {
  const colors = useThemeColors();
  const { draftValue, setDraftValue, displayLabel, ariaValueText } = useSliderStepperField({
    value: props.value,
    axisValues: props.axisValues,
    axisLabels: props.axisLabels,
    valueLabel: props.valueLabel,
  });
  const commitValue = props.onCommit ?? props.onChange;

  return (
    <Field label={props.label} valueLabel={displayLabel}>
      <View className="flex-row items-center gap-2">
        <Button
          className="h-8 w-8 min-w-8 px-0"
          compact
          disabled={props.previousDisabled || props.disabled}
          label="‹"
          size="sm"
          variant="outline"
          onPress={props.onPrevious}
        />
        <View
          accessibilityLabel={ariaValueText}
          accessibilityRole="adjustable"
          className="min-w-0 flex-1"
        >
          <Slider
            disabled={props.disabled}
            maximumTrackTintColor={colors.border}
            maximumValue={props.max}
            minimumTrackTintColor={colors.primary}
            minimumValue={props.min}
            step={props.step ?? 1}
            style={{ width: "100%", height: 32 }}
            thumbTintColor={colors.primary}
            value={draftValue}
            onSlidingComplete={(value) => {
              setDraftValue(value);
              commitValue?.(value);
            }}
            onValueChange={setDraftValue}
          />
        </View>
        <Button
          className="h-8 w-8 min-w-8 px-0"
          compact
          disabled={props.nextDisabled || props.disabled}
          label="›"
          size="sm"
          variant="outline"
          onPress={props.onNext}
        />
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
