import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function Button(props: {
  label: string;
  onPress?: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
  compact?: boolean;
}) {
  const { colors } = useShellTheme();
  const variant = props.variant ?? "default";
  const backgroundColor =
    variant === "default"
      ? colors.primary
      : variant === "destructive"
        ? colors.destructive
        : "transparent";
  const textColor =
    variant === "default" || variant === "destructive" ? colors.primaryForeground : colors.foreground;
  const borderColor = variant === "outline" ? colors.border : "transparent";

  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.button,
        props.compact ? styles.compact : null,
        {
          backgroundColor,
          borderColor,
          opacity: props.disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{props.label}</Text>
    </Pressable>
  );
}

export function DockButton(props: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useShellTheme();
  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.dock,
        {
          backgroundColor: props.active ? colors.primary : colors.muted,
          borderColor: colors.border,
          opacity: props.disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text style={{ color: props.active ? colors.primaryForeground : colors.foreground, fontSize: 12 }}>
        {props.label}
      </Text>
    </Pressable>
  );
}

export function Section(props: { title: string; children: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{props.title}</Text>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  compact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  dock: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
