import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../shell/buttons.tsx";
import { Field } from "../shell/field.tsx";
import { shellOutlineElevation } from "../shell/shell-chrome.ts";
import { Section } from "../shell/section.tsx";
import { Slider } from "../shell/slider.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";

export type NavigationValue = number | string;

export type NavigationOption<T extends NavigationValue = number> = {
  label: string;
  value: T;
};

export function toNavigationOptions(values: readonly number[]): NavigationOption<number>[] {
  return values.map((value) => ({ label: String(value), value }));
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
  step?: number;
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
        <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 14 }}>
          {selected?.label ?? String(props.value)}
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
                  <Text style={{ color: colors.foreground }}>{option.label}</Text>
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
  const [draftValue, setDraftValue] = useState(props.value);
  const commitValue = props.onCommit ?? props.onChange;

  useEffect(() => {
    setDraftValue(props.value);
  }, [props.value]);

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
