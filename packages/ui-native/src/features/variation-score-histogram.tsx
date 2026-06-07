import { StyleSheet, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

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
  const { colors } = useShellTheme();
  const height = props.height ?? 128;
  const maxBinCount = Math.max(1, ...props.bins.map((bin) => bin.count));

  return (
    <View
      style={[
        styles.root,
        { height, borderColor: colors.border, backgroundColor: colors.histogramSurface },
      ]}
    >
      <View style={styles.bars}>
        {props.bins.map((bin, index) => {
          const active = bin.end <= props.threshold;
          const barHeight = Math.max(4, (bin.count / maxBinCount) * 100);
          return (
            <View
              key={`${bin.start}:${bin.end}:${index}`}
              style={[
                styles.bar,
                {
                  height: `${barHeight}%`,
                  backgroundColor: active ? colors.primary : colors.mutedForeground,
                  opacity: active ? 1 : 0.28,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  bars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    minWidth: 2,
  },
});
