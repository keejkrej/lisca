import { View } from "react-native";

import { useThemeColors } from "../../theme/use-theme-colors";

export type VariationHistogramBin = {
  start: number;
  end: number;
  count: number;
};

export function VariationScoreHistogram(props: {
  bins: VariationHistogramBin[];
  threshold: number;
  height?: number;
}) {
  const colors = useThemeColors();
  const height = props.height ?? 128;
  const maxBinCount = Math.max(1, ...props.bins.map((bin) => bin.count));

  return (
    <View
      className="overflow-hidden rounded-lg border border-border bg-background px-3 py-2"
      style={{ height, borderColor: colors.border, backgroundColor: colors.background }}
    >
      <View className="flex-1 flex-row items-end gap-0.5">
        {props.bins.map((bin) => {
          const active = bin.end <= props.threshold;
          const barHeight = Math.max(4, (bin.count / maxBinCount) * 100);
          return (
            <View
              key={`${bin.start}:${bin.end}`}
              className="min-w-0.5 flex-1 rounded-t-sm"
              style={{
                height: `${barHeight}%`,
                backgroundColor: active ? colors.primary : colors.mutedForeground,
                opacity: active ? 1 : 0.28,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
