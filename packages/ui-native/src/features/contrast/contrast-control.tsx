import type { ContrastWindow } from "@lisca/contracts";
import { ContrastControl as HeadlessContrastControl } from "@lisca/ui-headless/contrast-control";
import type { FrameResult } from "@lisca/utils";
import { clamp } from "@lisca/utils";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Text } from "../../../components/ui/text";
import { Button } from "../../shell/chrome/buttons";
import { Section } from "../../shell/regions/section";
import { Slider } from "../../shell/chrome/slider";

export type ContrastControlProps = {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  onContrastChange: (contrast: ContrastWindow | null) => void;
  disabled?: boolean;
  title?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
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
    sectionStyle,
    sectionContentStyle,
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
          disabled={disabled}
          autoRangeDisabled={autoRangeDisabled}
          domainMax={domainMax}
          domainMin={domainMin}
          maxValue={maxValue}
          minValue={minValue}
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
  sectionStyle?: object;
  sectionContentStyle?: object;
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
    sectionStyle,
    sectionContentStyle,
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
        contentStyle={sectionContentStyle}
        description={sectionDescription}
        style={sectionStyle}
        title={sectionTitle}
      >
        <Text className="text-sm text-muted-foreground">Invalid intensity domain.</Text>
      </Section>
    );
  }

  return (
    <Section
      contentStyle={[{ gap: 12 }, sectionContentStyle]}
      description={sectionDescription}
      style={sectionStyle}
      title={sectionTitle}
    >
      {title?.trim() ? (
        <Text className="text-sm font-medium text-foreground">{title.trim()}</Text>
      ) : null}

      <Button
        disabled={disabled || autoRangeDisabled}
        label="Auto Range"
        size="sm"
        variant="outline"
        onPress={onAutoRange}
      />

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
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-muted-foreground">{props.label}</Text>
        <Text className="text-xs tabular-nums text-muted-foreground">
          {String(Math.round(props.value))}
        </Text>
      </View>
      <Slider
        disabled={props.disabled}
        maximumValue={props.domainMax}
        minimumValue={props.domainMin}
        step={1}
        style={{ width: "100%", height: 32 }}
        value={props.value}
        onSlidingComplete={props.onCommit}
        onValueChange={props.onDraftChange}
      />
    </View>
  );
}
