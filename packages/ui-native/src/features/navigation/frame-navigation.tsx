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
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../shell/chrome/buttons";
import { Field } from "../../shell/chrome/field";
import { shellOutlineElevation } from "../../shell/chrome/shell-chrome";
import { liscaType } from "../../theme/typography";
import { Section } from "../../shell/regions/section";
import { Slider } from "../../shell/chrome/slider";
import { useShellTheme } from "../../theme/shell-theme";

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
  const { colors, mode } = useShellTheme();
  const [open, setOpen] = useState(false);
  const selected = props.options.find((option) => option.value === props.value);

  return (
    <>
      <Pressable
        disabled={props.disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.selectTrigger,
          shellOutlineElevation(mode),
          {
            borderColor: colors.input,
            backgroundColor: colors.outlineSurface,
            opacity: props.disabled ? 0.64 : 1,
          },
        ]}
      >
        <Text numberOfLines={1} style={{ color: colors.foreground, ...liscaType.body }}>
          {selected
            ? formatNavigationOptionDisplayLabel(selected.label)
            : String(props.value)}
        </Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerScrim} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.pickerSheet,
              { backgroundColor: colors.popover, borderColor: colors.border },
            ]}
          >
            <ScrollView>
              {props.options.map((option) => (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    props.onChange(option.value);
                    setOpen(false);
                  }}
                  style={[
                    styles.pickerItem,
                    option.value === props.value ? { backgroundColor: colors.accent } : null,
                  ]}
                >
                  <Text style={{ color: colors.foreground }}>
                    {formatNavigationOptionDisplayLabel(option.label)}
                  </Text>
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
      <View style={styles.stepperRow}>
        <Button
          compact
          disabled={props.previousDisabled || props.disabled}
          label="‹"
          size="sm"
          style={styles.stepperButton}
          variant="outline"
          onPress={props.onPrevious}
        />
        <View style={styles.stepperCenter}>
          <SelectPicker
            disabled={props.disabled}
            options={props.options}
            value={props.value}
            onChange={props.onChange}
          />
        </View>
        <Button
          compact
          disabled={props.nextDisabled || props.disabled}
          label="›"
          size="sm"
          style={styles.stepperButton}
          variant="outline"
          onPress={props.onNext}
        />
      </View>
    </Field>
  );
}

function SliderStepperField(props: SliderNavigationFieldProps) {
  const { colors } = useShellTheme();
  const { draftValue, setDraftValue, displayLabel, ariaValueText } = useSliderStepperField({
    value: props.value,
    axisValues: props.axisValues,
    axisLabels: props.axisLabels,
    valueLabel: props.valueLabel,
  });
  const commitValue = props.onCommit ?? props.onChange;

  return (
    <Field label={props.label} valueLabel={displayLabel}>
      <View style={styles.stepperRow}>
        <Button
          compact
          disabled={props.previousDisabled || props.disabled}
          label="‹"
          size="sm"
          style={styles.stepperButton}
          variant="outline"
          onPress={props.onPrevious}
        />
        <View
          accessibilityLabel={ariaValueText}
          accessibilityRole="adjustable"
          style={styles.stepperCenter}
        >
          <Slider
            disabled={props.disabled}
            maximumValue={props.max}
            minimumValue={props.min}
            step={props.step ?? 1}
            style={styles.slider}
            thumbTintColor={colors.primary}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            value={draftValue}
            onSlidingComplete={(value) => {
              setDraftValue(value);
              commitValue?.(value);
            }}
            onValueChange={setDraftValue}
          />
        </View>
        <Button
          compact
          disabled={props.nextDisabled || props.disabled}
          label="›"
          size="sm"
          style={styles.stepperButton}
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
  } = props;

  return (
    <Section
      contentStyle={[{ gap: 12 }, sectionContentStyle]}
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

const styles = StyleSheet.create({
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperButton: {
    width: 32,
    minWidth: 32,
    paddingHorizontal: 0,
  },
  stepperCenter: {
    flex: 1,
    minWidth: 0,
  },
  slider: {
    width: "100%",
    height: 32,
  },
  selectTrigger: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 32,
    justifyContent: "center",
  },
  pickerScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 24,
  },
  pickerSheet: {
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 320,
    overflow: "hidden",
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
