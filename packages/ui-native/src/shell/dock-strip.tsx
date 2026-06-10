import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

export function DockStrip(props: { children?: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.root, props.style]}>{props.children}</View>;
}

const styles = StyleSheet.create({
  root: {
    alignItems: "stretch",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 0,
    padding: 12,
    width: "100%",
  },
});
