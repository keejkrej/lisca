import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ResultChartColors } from "./types";

export function ChartShell(props: {
  title: string;
  width: number;
  height: number;
  colors: ResultChartColors;
  children: ReactNode;
}) {
  return (
    <View style={[styles.panel, { width: props.width, minHeight: props.height }]}>
      <Text style={[styles.panelTitle, { color: props.colors.mutedText }]}>{props.title}</Text>
      <View style={{ width: props.width, height: props.height - 24 }}>{props.children}</View>
    </View>
  );
}

export function UnsupportedChart(props: {
  title: string;
  message: string;
  width: number;
  height: number;
  colors: ResultChartColors;
}) {
  return (
    <View style={[styles.panel, { width: props.width, minHeight: props.height }]}>
      <Text style={[styles.panelTitle, { color: props.colors.mutedText }]}>{props.title}</Text>
      <View
        style={[
          styles.unsupported,
          {
            borderColor: props.colors.grid,
            height: props.height - 24,
          },
        ]}
      >
        <Text style={{ color: props.colors.mutedText, fontSize: 13 }}>{props.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 8,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  unsupported: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});
