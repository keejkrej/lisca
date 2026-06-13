import type { ContrastWindow } from "@lisca/contracts";
import { ContrastControl as HeadlessContrastControl } from "@lisca/ui-headless/contrast-control";
import type { FrameResult } from "@lisca/utils";
import { clamp } from "@lisca/utils";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Text } from "../../../components/ui/text";
import { Button } from "../../../components/ui/button";
import { Section } from "../../shell/regions/section";
import { Slider } from "../../../components/ui/slider";

export type ContrastControlProps = {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  onContrastChange: (contrast: ContrastWindow | null) => void;
  disabled?: boolean;
  title?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
  accessibilityLabel?: string;
};

export function ContrastControl(props: ContrastControlProps) {
  const {
    frame,
    contrast,
    onContrastChange,
    disabled: disabledOverride,
    title,
    sectionTitle = "Contrast",
    sectionDescription,
    sectionClassName,
    sectionContentClassName,
    sectionStyle,
    sectionContentStyle,
    accessibilityLabel,
  } = props;

  return (
    <HeadlessContrastControl
      contrast={contrast}
      disabled={disabledOverride}
      frame={frame}
      onContrastChange={onContrastChange}
    >
      {({
        domainMin,
        domainMax,
        minValue,
        maxValue,
        disabled,
        autoRangeDisabled,
        onAutoRange,
        onMinCommit,
        onMaxCommit,
      }) => (
        <ContrastControlBody
          accessibilityLabel={accessibilityLabel}
          autoRangeDisabled={autoRangeDisabled}
          disabled={disabled}
          domainMax={domainMax}
          domainMin={domainMin}
          maxValue={maxValue}
          minValue={minValue}
          sectionClassName={sectionClassName}
          sectionContentClassName={sectionContentClassName}
          sectionContentStyle={sectionContentStyle}
          sectionDescription={sectionDescription}
          sectionStyle={sectionStyle}
          sectionTitle={sectionTitle}
          title={title}
          onAutoRange={onAutoRange}
          onMaxCommit={onMaxCommit}
          onMinCommit={onMinCommit}
        />
      )}
    </HeadlessContrastControl>
  );
}

function ContrastControlBody(props: {
  domainMin: number;
  domainMax: number;
  minValue: number;
  maxValue: number;
  disabled: boolean;
  autoRangeDisabled: boolean;
  onAutoRange: () => void;
  onMinCommit: (min: number) => void;
  onMaxCommit: (max: number) => void;
  title?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
  accessibilityLabel?: string;
}) {
  const {
    domainMin,
    domainMax,
    minValue,
    maxValue,
    disabled,
    autoRangeDisabled,
    onAutoRange,
    onMinCommit,
    onMaxCommit,
    title,
    sectionTitle = "Contrast",
    sectionDescription,
    sectionClassName,
    sectionContentClassName,
    sectionStyle,
    sectionContentStyle,
    accessibilityLabel,
  } = props;

  const domainOk = domainMax > domainMin;
  const [draft, setDraft] = useState<ContrastWindow | null>(null);

  useEffect(() => {
    setDraft({ min: minValue, max: maxValue });
  }, [minValue, maxValue]);

  const displayed = draft ?? { min: minValue, max: maxValue };

  if (!domainOk) {
    return (
      <Section
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="summary"
        className={sectionClassName}
        contentClassName={sectionContentClassName}
        contentStyle={sectionContentStyle}
        description={sectionDescription}
        style={sectionStyle}
        title={sectionTitle}
      >
        <Text className="text-xs text-muted-foreground">Invalid intensity domain.</Text>
      </Section>
    );
  }

  return (
    <Section
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="summary"
      className={sectionClassName}
      contentClassName={sectionContentClassName}
      contentStyle={sectionContentStyle}
      description={sectionDescription}
      style={sectionStyle}
      title={sectionTitle}
    >
      <View className="min-w-0 flex-col gap-3">
        {title?.trim() ? (
          <Text className="text-sm font-medium text-foreground">{title.trim()}</Text>
        ) : null}

        <View className="min-w-0 flex-col gap-3">
          <Button
            className="h-8 w-full justify-center px-2.5"
            disabled={disabled || autoRangeDisabled}
            size="sm"
            variant="outline"
            onPress={onAutoRange}
          >
            <Text className="text-xs">Auto Range</Text>
          </Button>

          <View className="min-h-0 min-w-0 flex-col gap-3">
            <ContrastSliderRow
              disabled={disabled}
              domainMax={domainMax}
              domainMin={domainMin}
              label="Min"
              value={displayed.min}
              onCommit={(value) => onMinCommit(clamp(Math.round(value), domainMin, domainMax))}
              onDraftChange={(value) =>
                setDraft((current) => {
                  const base = current ?? { min: minValue, max: maxValue };
                  return { ...base, min: clamp(Math.round(value), domainMin, domainMax) };
                })
              }
            />

            <ContrastSliderRow
              disabled={disabled}
              domainMax={domainMax}
              domainMin={domainMin}
              label="Max"
              value={displayed.max}
              onCommit={(value) => onMaxCommit(clamp(Math.round(value), domainMin, domainMax))}
              onDraftChange={(value) =>
                setDraft((current) => {
                  const base = current ?? { min: minValue, max: maxValue };
                  return { ...base, max: clamp(Math.round(value), domainMin, domainMax) };
                })
              }
            />
          </View>
        </View>
      </View>
    </Section>
  );
}

function ContrastSliderRow(props: {
  label: string;
  value: number;
  domainMin: number;
  domainMax: number;
  disabled?: boolean;
  onDraftChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  return (
    <View className="min-h-0 w-full min-w-0 gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-xs font-medium text-muted-foreground">{props.label}</Text>
        <Text className="text-xs tabular-nums text-muted-foreground/80">
          {String(Math.round(props.value))}
        </Text>
      </View>
      <Slider
        disabled={props.disabled}
        maximumValue={props.domainMax}
        minimumValue={props.domainMin}
        step={1}
        style={{ width: "100%", height: 4 }}
        value={props.value}
        onSlidingComplete={props.onCommit}
        onValueChange={props.onDraftChange}
      />
    </View>
  );
}
