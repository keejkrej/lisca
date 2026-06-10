import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function Spinner(props: { size?: "small" | "large" }) {
  const { colors } = useShellTheme();
  return (
    <View style={styles.root}>
      <ActivityIndicator size={props.size ?? "large"} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
});

export function Panel(props: { title?: string; children: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View
      style={[panelStyles.root, { backgroundColor: colors.background, borderColor: colors.border }]}
    >
      {props.title ? (
        <Text style={[panelStyles.title, { color: colors.foreground }]}>{props.title}</Text>
      ) : null}
      {props.children}
    </View>
  );
}

const panelStyles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
  },
});
