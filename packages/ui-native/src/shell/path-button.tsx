import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

function basename(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return null;
  return last.replace(/\.[^./\\]+$/, "");
}

export function PathButton(props: {
  label: string;
  value: string | null;
  icon?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useShellTheme();
  const display = basename(props.value) ?? props.label;
  const disabled = props.disabled ?? !props.onPress;

  return (
    <Pressable
      accessibilityLabel={props.value ?? props.label}
      disabled={disabled}
      onPress={props.onPress}
      style={[
        styles.root,
        {
          borderColor: colors.border,
          backgroundColor: colors.background,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {props.icon ? <View style={styles.icon}>{props.icon}</View> : null}
      <Text numberOfLines={1} style={[styles.label, { color: colors.foreground }]}>
        {display}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 288,
    minWidth: 0,
  },
  icon: {
    flexShrink: 0,
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "400",
  },
});
