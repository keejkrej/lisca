import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  shellChromeMetrics,
  shellOutlineButtonStyle,
  shellOutlineSurface,
} from "./shell-chrome.ts";
import { useShellTheme } from "../theme/shell-theme.tsx";
import type { ConnectionState } from "../state/use-shell-ws-probe.ts";

const STATUS_LABELS: Record<ConnectionState, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  open: "Connected",
  closed: "Disconnected",
};

const DOT_COLORS: Record<ConnectionState, string> = {
  idle: "#d4d4d4",
  connecting: "#fbbf24",
  open: "#10b981",
  closed: "#d4d4d4",
};

const DOT_COLORS_DARK: Record<ConnectionState, string> = {
  idle: "#525252",
  connecting: "#fbbf24",
  open: "#10b981",
  closed: "#525252",
};

export function ConnectionStatus(props: {
  state: ConnectionState;
  wsUrl?: string;
  label?: string;
  onOpenSettings?: () => void;
}) {
  const { colors, mode } = useShellTheme();
  const title = props.label ?? "Server";
  const statusLabel = STATUS_LABELS[props.state];
  const dotColors = mode === "dark" ? DOT_COLORS_DARK : DOT_COLORS;
  const surface = shellOutlineSurface(colors, mode);

  const content = (
    <>
      <View style={[styles.dot, { backgroundColor: dotColors[props.state] }]} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.status, { color: colors.foreground }]}>{statusLabel}</Text>
    </>
  );

  if (props.onOpenSettings) {
    return (
      <Pressable
        accessibilityLabel={`${title}, ${statusLabel}`}
        accessibilityRole="button"
        onPress={props.onOpenSettings}
        style={[shellOutlineButtonStyle, surface, styles.root]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[shellOutlineButtonStyle, surface, styles.root]} accessibilityRole="text">
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  title: {
    fontSize: shellChromeMetrics.fontSize,
    fontWeight: "500",
    flexShrink: 0,
  },
  status: {
    fontSize: shellChromeMetrics.fontSize,
    fontWeight: "400",
    opacity: 0.7,
    flexShrink: 0,
  },
});
