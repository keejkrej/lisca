import { StyleSheet, Text, View } from "react-native";

import { Slider } from "../../shell/chrome/slider";
import { useShellTheme } from "../../theme/shell-theme";
import { liscaType } from "../../theme/typography";

export function AnnotationToolSlider(props: {
  label: string;
  value: number;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const { colors } = useShellTheme();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{props.label}</Text>
        <Text style={[styles.value, { color: colors.mutedForeground }]}>{props.valueLabel}</Text>
      </View>
      <Slider
        disabled={props.disabled}
        maximumValue={props.max}
        minimumValue={props.min}
        step={props.step}
        style={styles.slider}
        thumbTintColor={colors.primary}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        value={props.value}
        onValueChange={props.onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 4,
    minWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    flex: 1,
    ...liscaType.bodySmallMedium,
  },
  value: {
    ...liscaType.bodySmall,
    fontVariant: ["tabular-nums"],
  },
  slider: {
    width: "100%",
    height: 32,
  },
});
