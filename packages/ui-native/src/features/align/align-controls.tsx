import { clamp } from "@lisca/utils";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";

import { Toggle } from "../../../components/ui/toggle";
import { Button } from "../../shell/chrome/buttons";
import { Field } from "../../shell/chrome/field";
import { Input } from "../../shell/chrome/input";
import { Section } from "../../shell/regions/section";
import { Slider } from "../../shell/chrome/slider";
import { Text as UiText } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";
import { AlignGridShapeToggle, type AlignGridShapeToggleProps } from "./align-grid-shape-toggle";

type AlignGridShape = AlignGridShapeToggleProps["shape"];

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
      className="min-w-0 flex-1"
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
      contentClassName={cn("gap-3", sectionContentClassName)}
      contentStyle={sectionContentStyle}
      description={sectionDescription}
      style={sectionStyle}
      title={sectionTitle}
    >
      <View className="flex-row gap-2">
        <Toggle
          accessibilityLabel="Show grid overlay"
          className="min-w-0 flex-1"
          disabled={disabled}
          pressed={overlayVisible}
          size="sm"
          variant="outline"
          onPressedChange={onOverlayVisibleChange}
        >
          <UiText className="text-xs">Show</UiText>
        </Toggle>
        <Button
          className="min-w-0 flex-1"
          disabled={disabled || resetDisabled || !onReset}
          label="Reset"
          size="sm"
          variant="outline"
          onPress={() => onReset?.()}
        />
      </View>

      <Field label="Opacity">
        <Slider
          disabled={disabled}
          maximumValue={1}
          minimumValue={0}
          step={0.01}
          style={{ width: "100%", height: 32 }}
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
        <AlignGridShapeToggle disabled={disabled} shape={shape} onShapeChange={onShapeChange} />
      </Field>

      <Field label="Rotation">
        <Slider
          disabled={disabled}
          maximumValue={180}
          minimumValue={-180}
          step={0.1}
          style={{ width: "100%", height: 32 }}
          value={rotationDraft}
          onSlidingComplete={(value) => {
            const degrees = clamp(value, -180, 180);
            setRotationDraft(degrees);
            onRotationDegreesChange(degrees);
          }}
          onValueChange={(value) => setRotationDraft(clamp(value, -180, 180))}
        />
      </Field>

      <View className="flex-row gap-2">
        <View className="min-w-0 flex-1">
          <Field label="Vector A">
            <AlignNumberInput
              disabled={disabled}
              min={vectorMin}
              value={vectorA}
              onCommit={onVectorAChange}
            />
          </Field>
        </View>
        <View className="min-w-0 flex-1">
          <Field label="Vector B">
            <AlignNumberInput
              disabled={disabled}
              min={vectorMin}
              value={vectorB}
              onCommit={onVectorBChange}
            />
          </Field>
        </View>
      </View>

      <View className="flex-row gap-2">
        <View className="min-w-0 flex-1">
          <Field label="Pattern Width">
            <AlignNumberInput
              disabled={disabled}
              min={patternMin}
              value={patternWidth}
              onCommit={onPatternWidthChange}
            />
          </Field>
        </View>
        <View className="min-w-0 flex-1">
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

      <View className="flex-row gap-2">
        <View className="min-w-0 flex-1">
          <Field label="Offset X">
            <AlignNumberInput
              disabled={disabled}
              step="0.1"
              value={offsetX}
              onCommit={onOffsetXChange}
            />
          </Field>
        </View>
        <View className="min-w-0 flex-1">
          <Field label="Offset Y">
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

export function ReadonlyPathField(props: {
  value: string;
  className?: string;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      className={cn(
        "h-10 min-w-0 w-full items-center justify-center self-stretch rounded-lg border border-border bg-muted px-2",
        props.className,
      )}
    >
      <UiText className="w-full font-mono text-sm text-foreground" numberOfLines={1}>
        {props.value}
      </UiText>
    </View>
  );
}
