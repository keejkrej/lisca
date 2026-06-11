import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../../theme/shell-theme";
import { liscaType } from "../../theme/typography";

export function Field(props: { label: string; valueLabel?: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.root, props.style]}>
      <View style={styles.labelRow}>
        <FieldLabel>{props.label}</FieldLabel>
        {props.valueLabel ? <FieldValue>{props.valueLabel}</FieldValue> : null}
      </View>
      {props.children}
    </View>
  );
}

export function FieldLabel(props: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return <Text style={[styles.label, { color: colors.mutedForeground }]}>{props.children}</Text>;
}

function FieldValue(props: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return <Text style={[styles.value, { color: colors.mutedForeground }]}>{props.children}</Text>;
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
    minWidth: 0,
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
  },
  label: {
    ...liscaType.bodySmallMedium,
  },
  value: {
    ...liscaType.bodySmall,
  },
});
