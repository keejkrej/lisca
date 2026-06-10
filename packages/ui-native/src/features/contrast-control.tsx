import { clamp } from "@lisca/utils";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../shell/buttons.tsx";
import { Section } from "../shell/section.tsx";
import { Slider } from "../shell/slider.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";

export type ContrastWindow = {
  min: number;
  max: number;
};

export type ContrastControlProps = {
  domainMin: number;
  domainMax: number;
  minValue: number;
  maxValue: number;
  disabled?: boolean;
  onMinCommit: (value: number) => void;
  onMaxCommit: (value: number) => void;
  onAutoRange?: () => void;
  autoRangeDisabled?: boolean;
  title?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
};

export function ContrastControl(props: ContrastControlProps) {
  const { colors } = useShellTheme();
  const {
    domainMin,
    domainMax,
    minValue,
    maxValue,
    disabled,
    onMinCommit,
    onMaxCommit,
    onAutoRange,
    autoRangeDisabled,
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
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          Invalid intensity domain.
        </Text>
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
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>
          {title.trim()}
        </Text>
      ) : null}

      {onAutoRange ? (
        <Button
          disabled={disabled || autoRangeDisabled}
          label="Auto Range"
          size="sm"
          variant="outline"
          onPress={onAutoRange}
        />
      ) : null}

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
  const { colors } = useShellTheme();
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "500" }}>
          {props.label}
        </Text>
        <Text
          style={{ color: colors.mutedForeground, fontSize: 12, fontVariant: ["tabular-nums"] }}
        >
          {String(Math.round(props.value))}
        </Text>
      </View>
      <Slider
        disabled={props.disabled}
        maximumValue={props.domainMax}
        minimumValue={props.domainMin}
        step={1}
        style={styles.slider}
        thumbTintColor={colors.primary}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        value={props.value}
        onSlidingComplete={props.onCommit}
        onValueChange={props.onDraftChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sliderRow: {
    gap: 4,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slider: {
    width: "100%",
    height: 32,
  },
});
