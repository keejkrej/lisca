import type { AlignGridShape } from "@lisca/contracts";
import { clamp } from "@lisca/utils";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Field, FieldLabel } from "../../../components/ui/field";
import { Input } from "../../../components/ui/input";
import { Slider } from "../../../components/ui/slider";
import { Text } from "../../../components/ui/text";
import { Toggle } from "../../../components/ui/toggle";
import { cn } from "../../../lib/utils";
import { Section } from "../../shell/regions/section";
import { AlignGridShapeToggle } from "./align-grid-shape-toggle";

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
    <Input
      className="min-w-0 w-full"
      editable={!props.disabled}
      keyboardType="numeric"
      value={draft}
      onBlur={commit}
      onChangeText={setDraft}
      onSubmitEditing={commit}
      {...(Platform.OS === "web"
        ? {
            onKeyDown: (event: { key: string; currentTarget: { blur: () => void } }) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                skipBlurCommitRef.current = true;
                revert();
                event.currentTarget.blur();
              }
            },
          }
        : {})}
    />
  );
}

export type AlignGridProps = {
  overlayVisible: boolean;
  onOverlayVisibleChange: (visible: boolean) => void;
  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;
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
  sectionClassName?: string;
  sectionContentClassName?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
};

export function AlignGrid(props: AlignGridProps) {
  const {
    overlayVisible,
    onOverlayVisibleChange,
    shape,
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
    sectionClassName,
    sectionContentClassName,
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
      className={sectionClassName}
      contentClassName={sectionContentClassName}
      contentStyle={sectionContentStyle}
      description={sectionDescription}
      style={sectionStyle}
      title={sectionTitle}
    >
      <View className="min-w-0 gap-3">
        <View className="w-full flex-row gap-2">
          <View className="min-w-0 flex-1">
            <Toggle
              accessibilityLabel="Show grid overlay"
              accessibilityState={{ selected: overlayVisible }}
              className="w-full justify-center"
              disabled={disabled}
              pressed={overlayVisible}
              size="sm"
              variant="outline"
              onPressedChange={onOverlayVisibleChange}
            >
              <Text>Show</Text>
            </Toggle>
          </View>
          <View className="min-w-0 flex-1">
            <Button
              className="w-full justify-center"
              disabled={disabled || resetDisabled || !onReset}
              size="sm"
              variant="outline"
              onPress={() => onReset?.()}
            >
              <Text>Reset</Text>
            </Button>
          </View>
        </View>

        <Field className="min-w-0 w-full gap-0.5">
          <FieldLabel>Opacity</FieldLabel>
          <View className="w-full pt-0.5">
            <Slider
              disabled={disabled}
              maximumValue={1}
              minimumValue={0}
              step={0.01}
              value={overlayOpacityDraft}
              onSlidingComplete={(value) => {
                const opacity = clamp(value, 0, 1);
                setOverlayOpacityDraft(opacity);
                onOverlayOpacityChange(opacity);
              }}
              onValueChange={(value) => setOverlayOpacityDraft(clamp(value, 0, 1))}
            />
          </View>
        </Field>

        <Field className="min-w-0 w-full">
          <FieldLabel>Grid shape</FieldLabel>
          <AlignGridShapeToggle disabled={disabled} shape={shape} onShapeChange={onShapeChange} />
        </Field>

        <Field className="min-w-0 w-full gap-0.5">
          <FieldLabel>Rotation</FieldLabel>
          <View className="w-full pt-0.5">
            <Slider
              disabled={disabled}
              maximumValue={180}
              minimumValue={-180}
              step={0.1}
              value={rotationDraft}
              onSlidingComplete={(value) => {
                const degrees = clamp(value, -180, 180);
                setRotationDraft(degrees);
                onRotationDegreesChange(degrees);
              }}
              onValueChange={(value) => setRotationDraft(clamp(value, -180, 180))}
            />
          </View>
        </Field>

        <View className="flex-row gap-2">
          <Field className="min-w-0 flex-1">
            <FieldLabel>Vector A</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              min={vectorMin}
              value={vectorA}
              onCommit={onVectorAChange}
            />
          </Field>
          <Field className="min-w-0 flex-1">
            <FieldLabel>Vector B</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              min={vectorMin}
              value={vectorB}
              onCommit={onVectorBChange}
            />
          </Field>
        </View>

        <View className="flex-row gap-2">
          <Field className="min-w-0 flex-1">
            <FieldLabel>Pattern Width</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              min={patternMin}
              value={patternWidth}
              onCommit={onPatternWidthChange}
            />
          </Field>
          <Field className="min-w-0 flex-1">
            <FieldLabel>Pattern Height</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              min={patternMin}
              value={patternHeight}
              onCommit={onPatternHeightChange}
            />
          </Field>
        </View>

        <View className="flex-row gap-2">
          <Field className="min-w-0 flex-1">
            <FieldLabel>Offset X</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              step="0.1"
              value={offsetX}
              onCommit={onOffsetXChange}
            />
          </Field>
          <Field className="min-w-0 flex-1">
            <FieldLabel>Offset Y</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              step="0.1"
              value={offsetY}
              onCommit={onOffsetYChange}
            />
          </Field>
        </View>
      </View>
    </Section>
  );
}
