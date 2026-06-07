import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function Field(props: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.root, props.style]}>
      <FieldLabel>{props.label}</FieldLabel>
      {props.children}
    </View>
  );
}

export function FieldLabel(props: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <Text style={[styles.label, { color: colors.mutedForeground }]}>{props.children}</Text>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
    minWidth: 0,
    width: "100%",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
