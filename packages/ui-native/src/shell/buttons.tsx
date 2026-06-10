import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  shellChromeMetrics,
  shellOutlineButtonStyle,
  shellOutlineElevation,
  shellOutlineSurface,
} from "./shell-chrome.ts";
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
  const { colors, mode } = useShellTheme();
  const variant = props.variant ?? "default";
  const size = props.size ?? (props.compact ? "sm" : "default");
  const isSm = size === "sm";
  const textColor =
    variant === "default" || variant === "destructive"
      ? colors.primaryForeground
      : colors.foreground;
  const borderColor = variant === "outline" ? colors.input : "transparent";
  const disabled = props.disabled || props.loading;
  const backgroundColor =
    variant === "default"
      ? colors.primary
      : variant === "destructive"
        ? colors.destructive
        : variant === "outline"
          ? colors.outlineSurface
          : "transparent";

  return (
    <Pressable
      disabled={disabled}
      onPress={props.onPress}
      style={[
        isSm ? shellOutlineButtonStyle : styles.button,
        isSm && variant === "outline" ? shellOutlineSurface(colors, mode) : null,
        isSm ? styles.sm : null,
        variant === "outline" && !isSm ? shellOutlineElevation(mode) : null,
        {
          backgroundColor: isSm && variant === "outline" ? colors.outlineSurface : backgroundColor,
          borderColor: variant === "outline" ? colors.input : borderColor,
          opacity: disabled ? 0.64 : 1,
        },
        props.style,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          numberOfLines={isSm ? 1 : 2}
          style={[
            isSm ? styles.smLabel : styles.label,
            { color: textColor, textAlign: "center", width: isSm ? undefined : "100%" },
          ]}
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
  const { colors, mode } = useShellTheme();
  return (
    <View style={[styles.segmented, { borderColor: colors.input }]}>
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
              !isLast
                ? { borderRightWidth: 1, borderRightColor: colors.border }
                : { borderRightWidth: 0 },
              !active ? shellOutlineElevation(mode) : null,
              {
                backgroundColor: active ? colors.primary : colors.outlineSurface,
                opacity: props.disabled ? 0.64 : 1,
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
    borderRadius: shellChromeMetrics.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  sm: {
    flexShrink: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  smLabel: {
    fontSize: shellChromeMetrics.fontSize,
    fontWeight: "500",
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
  },
});
