import { StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../../theme/shell-theme";
import { liscaType } from "../../theme/typography";

export function StatTile(props: {
  label: string;
  value: string | number;
  centered?: boolean;
  style?: object;
}) {
  const { colors } = useShellTheme();
  const textAlign = props.centered ? "center" : "left";
  return (
    <View
      style={[
        styles.root,
        { borderColor: colors.border, backgroundColor: colors.background },
        props.style,
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
        {props.label}
      </Text>
      <Text style={[styles.value, { color: colors.foreground, textAlign }]}>{props.value}</Text>
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
    ...liscaType.statLabel,
  },
  value: {
    ...liscaType.statValue,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
});
