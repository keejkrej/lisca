import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export function StudioDockStrip(props: { panels: 2 | 3; children: ReactNode }) {
  const children = Array.isArray(props.children) ? props.children : [props.children];
  const flexWeights = props.panels === 2 ? [2, 2] : [2, 3, 2];

  return (
    <View style={styles.root}>
      {children.map((child, index) => (
        <View key={index} style={[styles.panel, { flex: flexWeights[index] ?? 1 }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 0,
    padding: 12,
    width: "100%",
  },
  panel: {
    minWidth: 0,
  },
});
