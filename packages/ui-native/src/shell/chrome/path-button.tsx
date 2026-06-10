import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import {
  shellChromeMetrics,
  shellOutlineButtonStyle,
  shellOutlineSurface,
} from "./shell-chrome";
import { useShellTheme } from "../../theme/shell-theme";

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
  const { colors, mode } = useShellTheme();
  const display = basename(props.value) ?? props.label;
  const disabled = props.disabled ?? !props.onPress;

  return (
    <Pressable
      accessibilityLabel={props.value ?? props.label}
      disabled={disabled}
      onPress={props.onPress}
      style={[
        shellOutlineButtonStyle,
        shellOutlineSurface(colors, mode),
        styles.root,
        { opacity: disabled ? 0.64 : 1 },
      ]}
    >
      {props.icon}
      <Text numberOfLines={1} style={[styles.label, { color: colors.foreground }]}>
        {display}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    maxWidth: 288,
    minWidth: 0,
    flexShrink: 1,
  },
  label: {
    flexShrink: 1,
    fontSize: shellChromeMetrics.fontSize,
    fontWeight: "400",
  },
});
