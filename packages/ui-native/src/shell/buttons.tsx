import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function Button(props: {
  label: string;
  onPress?: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
  compact?: boolean;
  size?: "sm" | "default";
  loading?: boolean;
  style?: object;
}) {
  const { colors } = useShellTheme();
  const variant = props.variant ?? "default";
  const size = props.size ?? (props.compact ? "sm" : "default");
  const backgroundColor =
    variant === "default"
      ? colors.primary
      : variant === "destructive"
        ? colors.destructive
        : "transparent";
  const textColor =
    variant === "default" || variant === "destructive" ? colors.primaryForeground : colors.foreground;
  const borderColor = variant === "outline" ? colors.border : "transparent";
  const disabled = props.disabled || props.loading;

  return (
    <Pressable
      disabled={disabled}
      onPress={props.onPress}
      style={[
        styles.button,
        size === "sm" ? styles.sm : null,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        props.style,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[size === "sm" ? styles.smLabel : styles.label, { color: textColor }]}>
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

export function DockButton(props: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "default";
  style?: object;
}) {
  const { colors } = useShellTheme();
  const disabled = props.disabled || props.loading;
  return (
    <Pressable
      disabled={disabled}
      onPress={props.onPress}
      style={[
        styles.dock,
        props.size === "sm" ? styles.dockSm : null,
        {
          backgroundColor: props.active ? colors.primary : colors.muted,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        props.style,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={props.active ? colors.primaryForeground : colors.foreground} size="small" />
      ) : (
        <Text
          numberOfLines={1}
          style={{
            color: props.active ? colors.primaryForeground : colors.foreground,
            fontSize: props.size === "sm" ? 11 : 12,
          }}
        >
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

export function SegmentedToggle(props: {
  value: string;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.segmented, { borderColor: colors.border }]}>
      {props.options.map((option, index) => {
        const active = props.value === option.value;
        const isLast = index === props.options.length - 1;
        return (
          <Pressable
            key={option.value}
            disabled={props.disabled}
            onPress={() => props.onChange(option.value)}
            style={[
              styles.segment,
              !isLast ? { borderRightColor: colors.border } : null,
              {
                backgroundColor: active ? colors.primary : "transparent",
                opacity: props.disabled ? 0.5 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.primaryForeground : colors.foreground,
                fontSize: 12,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
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
    justifyContent: "center",
    minHeight: 40,
  },
  sm: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  smLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  dock: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 72,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dockSm: {
    minHeight: 32,
    paddingVertical: 6,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRightWidth: 1,
  },
});
