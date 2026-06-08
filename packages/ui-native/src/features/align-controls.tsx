import type { AlignGridShape } from "@lisca/contracts";
import { clamp } from "@lisca/utils";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button, SegmentedToggle } from "../shell/buttons.tsx";
import { Field } from "../shell/field.tsx";
import { Section } from "../shell/section.tsx";
import { Slider } from "../shell/slider.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";
import type { NavigationOption, NavigationValue } from "./frame-navigation.tsx";

function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function AlignNumberInput(props: {
  value: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
  min?: number;
  step?: string;
}) {
  const { colors } = useShellTheme();
  const [draft, setDraft] = useState(formatNumber(props.value));
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    setDraft(formatNumber(props.value));
  }, [props.value]);

  const revert = () => setDraft(formatNumber(props.value));
  const commit = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      revert();
      return;
    }
    const trimmed = draft.trim();
    const value = trimmed === "" ? NaN : Number(trimmed);
    if (!Number.isFinite(value) || (props.min != null && value < props.min)) {
      revert();
      return;
    }
    setDraft(formatNumber(value));
    props.onCommit(value);
  };

  return (
    <TextInput
      editable={!props.disabled}
      keyboardType="numeric"
      value={draft}
      onBlur={commit}
      onChangeText={setDraft}
      onSubmitEditing={commit}
      style={[
        styles.numberInput,
        { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.controlSurface },
      ]}
    />
  );
}

export type AlignGridProps<TShape extends NavigationValue = string> = {
  overlayVisible: boolean;
  onOverlayVisibleChange: (visible: boolean) => void;
  shape: TShape;
  shapeOptions: readonly NavigationOption<TShape>[];
  onShapeChange: (shape: TShape) => void;
  rotationDegrees: number;
  onRotationDegreesChange: (degrees: number) => void;
  vectorA: number;
  vectorB: number;
  onVectorAChange: (value: number) => void;
  onVectorBChange: (value: number) => void;
  vectorMin?: number;
  patternWidth: number;
  patternHeight: number;
  onPatternWidthChange: (value: number) => void;
  onPatternHeightChange: (value: number) => void;
  patternMin?: number;
  offsetX: number;
  offsetY: number;
  onOffsetXChange: (value: number) => void;
  onOffsetYChange: (value: number) => void;
  overlayOpacity: number;
  onOverlayOpacityChange: (opacity: number) => void;
  onReset?: () => void;
  resetDisabled?: boolean;
  disabled?: boolean;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
};

export function AlignGrid<TShape extends NavigationValue = string>(props: AlignGridProps<TShape>) {
  const { colors } = useShellTheme();
  const {
    overlayVisible,
    onOverlayVisibleChange,
    shape,
    shapeOptions,
    onShapeChange,
    rotationDegrees,
    onRotationDegreesChange,
    vectorA,
    vectorB,
    onVectorAChange,
    onVectorBChange,
    vectorMin = 1,
    patternWidth,
    patternHeight,
    onPatternWidthChange,
    onPatternHeightChange,
    patternMin = 1,
    offsetX,
    offsetY,
    onOffsetXChange,
    onOffsetYChange,
    overlayOpacity,
    onOverlayOpacityChange,
    onReset,
    resetDisabled,
    disabled,
    sectionTitle = "Grid",
    sectionDescription,
    sectionStyle,
    sectionContentStyle,
  } = props;

  const [rotationDraft, setRotationDraft] = useState(rotationDegrees);
  const [overlayOpacityDraft, setOverlayOpacityDraft] = useState(overlayOpacity);

  useEffect(() => {
    setRotationDraft(rotationDegrees);
  }, [rotationDegrees]);

  useEffect(() => {
    setOverlayOpacityDraft(overlayOpacity);
  }, [overlayOpacity]);

  return (
    <Section
      contentStyle={[{ gap: 12 }, sectionContentStyle]}
      description={sectionDescription}
      style={sectionStyle}
      title={sectionTitle}
    >
      <Field label="Overlay">
        <Button
          disabled={disabled || resetDisabled || !onReset}
          label="Reset"
          size="sm"
          variant="outline"
          onPress={() => onReset?.()}
        />
        <SegmentedToggle
          disabled={disabled}
          options={[
            { value: "hide", label: "Hide" },
            { value: "show", label: "Show" },
          ]}
          value={overlayVisible ? "show" : "hide"}
          onChange={(value) => onOverlayVisibleChange(value === "show")}
        />
      </Field>

      <Field label="Opacity">
        <Slider
          disabled={disabled}
          maximumValue={1}
          minimumValue={0}
          step={0.01}
          style={styles.slider}
          thumbTintColor={colors.primary}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          value={overlayOpacityDraft}
          onSlidingComplete={(value) => {
            const opacity = clamp(value, 0, 1);
            setOverlayOpacityDraft(opacity);
            onOverlayOpacityChange(opacity);
          }}
          onValueChange={(value) => setOverlayOpacityDraft(clamp(value, 0, 1))}
        />
      </Field>

      <Field label="Grid shape">
        <SegmentedToggle
          disabled={disabled}
          options={shapeOptions.map((option) => ({ value: String(option.value), label: option.label }))}
          value={String(shape)}
          onChange={(value) => {
            const match = shapeOptions.find((option) => String(option.value) === value);
            if (match) onShapeChange(match.value);
          }}
        />
      </Field>

      <Field label="Rotation">
        <Slider
          disabled={disabled}
          maximumValue={180}
          minimumValue={-180}
          step={0.1}
          style={styles.slider}
          thumbTintColor={colors.primary}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          value={rotationDraft}
          onSlidingComplete={(value) => {
            const degrees = clamp(value, -180, 180);
            setRotationDraft(degrees);
            onRotationDegreesChange(degrees);
          }}
          onValueChange={(value) => setRotationDraft(clamp(value, -180, 180))}
        />
      </Field>

      <View style={styles.grid2}>
        <View style={styles.gridCell}>
          <Field label="Vector A">
            <AlignNumberInput disabled={disabled} min={vectorMin} value={vectorA} onCommit={onVectorAChange} />
          </Field>
        </View>
        <View style={styles.gridCell}>
          <Field label="Vector B">
            <AlignNumberInput disabled={disabled} min={vectorMin} value={vectorB} onCommit={onVectorBChange} />
          </Field>
        </View>
      </View>

      <View style={styles.grid2}>
        <View style={styles.gridCell}>
          <Field label="Pattern Width">
            <AlignNumberInput
              disabled={disabled}
              min={patternMin}
              value={patternWidth}
              onCommit={onPatternWidthChange}
            />
          </Field>
        </View>
        <View style={styles.gridCell}>
          <Field label="Pattern Height">
            <AlignNumberInput
              disabled={disabled}
              min={patternMin}
              value={patternHeight}
              onCommit={onPatternHeightChange}
            />
          </Field>
        </View>
      </View>

      <View style={styles.grid2}>
        <View style={styles.gridCell}>
          <Field label="Offset X">
            <AlignNumberInput disabled={disabled} step="0.1" value={offsetX} onCommit={onOffsetXChange} />
          </Field>
        </View>
        <View style={styles.gridCell}>
          <Field label="Offset Y">
            <AlignNumberInput disabled={disabled} step="0.1" value={offsetY} onCommit={onOffsetYChange} />
          </Field>
        </View>
      </View>
    </Section>
  );
}

export function ReadonlyPathField(props: { value: string; style?: object }) {
  const { colors } = useShellTheme();
  return (
    <View
      style={[
        pathStyles.root,
        { borderColor: colors.border, backgroundColor: colors.muted },
        props.style,
      ]}
    >
      <Text numberOfLines={1} style={[pathStyles.text, { color: colors.foreground }]}>
        {props.value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slider: {
    width: "100%",
    height: 32,
  },
  grid2: {
    flexDirection: "row",
    gap: 8,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    minWidth: 0,
    flex: 1,
  },
});

const pathStyles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
    minWidth: 0,
  },
  text: {
    fontSize: 12,
    fontFamily: "monospace",
    padding: 0,
  },
});
