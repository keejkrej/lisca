import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "../../../../components/ui/text";
import type { ResultChartColors } from "./types";

export function ChartShell(props: {
  title: string;
  width: number;
  height: number;
  colors: ResultChartColors;
  children: ReactNode;
}) {
  return (
    <View className="gap-2" style={{ width: props.width, minHeight: props.height }}>
      <Text className="text-sm font-medium" style={{ color: props.colors.mutedText }}>
        {props.title}
      </Text>
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
    <View className="gap-2" style={{ width: props.width, minHeight: props.height }}>
      <Text className="text-sm font-medium" style={{ color: props.colors.mutedText }}>
        {props.title}
      </Text>
      <View
        className="items-center justify-center rounded-lg border px-4"
        style={{
          borderColor: props.colors.grid,
          height: props.height - 24,
        }}
      >
        <Text className="text-xs" style={{ color: props.colors.mutedText }}>
          {props.message}
        </Text>
      </View>
    </View>
  );
}
