import { StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";
import type { ConnectionState } from "../state/use-shell-ws-probe.ts";

const LABELS: Record<ConnectionState, string> = {
  idle: "Idle",
  connecting: "Connecting",
  open: "Connected",
  closed: "Disconnected",
};

const COLORS: Record<ConnectionState, string> = {
  idle: "#71717a",
  connecting: "#f59e0b",
  open: "#22c55e",
  closed: "#ef4444",
};

export function ConnectionStatus(props: { state: ConnectionState; onPress?: () => void }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.root, { borderColor: colors.border, backgroundColor: colors.muted }]}>
      <View style={[styles.dot, { backgroundColor: COLORS[props.state] }]} />
      <Text style={[styles.label, { color: colors.foreground }]}>{LABELS[props.state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
