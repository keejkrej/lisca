import { StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function StatTile(props: { label: string; value: string | number; style?: object }) {
  const { colors } = useShellTheme();
  return (
    <View
      style={[
        styles.root,
        { borderColor: colors.border, backgroundColor: colors.stat },
        props.style,
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{props.label}</Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
});
