import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export function SidebarStack(props: { children?: ReactNode; style?: object }) {
  return <View style={[styles.root, props.style]}>{props.children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "column",
    gap: 8,
    minHeight: 0,
    overflow: "hidden",
    padding: 12,
  },
});
