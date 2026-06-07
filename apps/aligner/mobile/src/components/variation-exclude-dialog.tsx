import {
  Button,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  ModalScrim,
  Slider,
  StatTile,
  useShellTheme,
  VariationScoreHistogram,
} from "@lisca/ui-native";
import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import type { VariationExcludePreview } from "../state/use-align-state";

type VariationExcludeDialogProps = {
  state: VariationExcludePreview | null;
  onApply: () => void;
  onCancel: () => void;
  onThresholdChange: (threshold: number) => void;
};

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000";
}

function clampThreshold(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function VariationExcludeDialog({
  state,
  onApply,
  onCancel,
  onThresholdChange,
}: VariationExcludeDialogProps) {
  const { colors } = useShellTheme();
  const preview = state?.preview ?? null;
  const threshold = state?.threshold ?? 0;
  const selectedCount = useMemo(
    () => preview?.cellScores.filter((cell) => cell.score <= threshold).length ?? 0,
    [preview, threshold],
  );

  if (!preview) return null;

  const min = preview.scoreMin;
  const max = preview.scoreMax > preview.scoreMin ? preview.scoreMax : preview.scoreMin + 1;
  const step = Math.max((max - min) / 500, 0.001);

  return (
    <ModalScrim open={true} onClose={onCancel}>
      <DialogSurface maxWidth={640} padded={false}>
        <DialogHeader>
          <Text style={[styles.title, { color: colors.foreground }]}>Var exclude</Text>
        </DialogHeader>

        <DialogBody>
          <View style={styles.statsRow}>
            <StatTile label="Eligible cells" value={preview.eligibleCellCount} />
            <StatTile label="Selected cells" value={selectedCount} />
            <StatTile
              label="Score range"
              value={`${formatScore(preview.scoreMin)} - ${formatScore(preview.scoreMax)}`}
            />
          </View>

          <VariationScoreHistogram bins={preview.histogramBins} threshold={threshold} />

          <View style={styles.thresholdRow}>
            <View style={styles.thresholdSlider}>
              <View style={styles.thresholdHeader}>
                <Text style={[styles.thresholdLabel, { color: colors.foreground }]}>Threshold</Text>
                <Text style={[styles.thresholdValue, { color: colors.mutedForeground }]}>
                  {formatScore(threshold)}
                </Text>
              </View>
              <Slider
                maximumValue={max}
                minimumValue={min}
                step={step}
                style={styles.slider}
                thumbTintColor={colors.primary}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                value={threshold}
                onSlidingComplete={(value) => onThresholdChange(clampThreshold(value, min, max))}
                onValueChange={(value) => onThresholdChange(clampThreshold(value, min, max))}
              />
            </View>
            <TextInput
              keyboardType="decimal-pad"
              value={String(threshold)}
              onChangeText={(text) => onThresholdChange(clampThreshold(Number(text), min, max))}
              style={[
                styles.input,
                { borderColor: colors.input, color: colors.foreground, backgroundColor: colors.controlSurface },
              ]}
            />
          </View>
        </DialogBody>

        <DialogFooter>
          <Button label="Cancel" variant="outline" onPress={onCancel} />
          <Button label="Apply" onPress={onApply} />
        </DialogFooter>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  thresholdSlider: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  thresholdHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  thresholdLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  thresholdValue: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  slider: {
    width: "100%",
    height: 32,
  },
  input: {
    width: 112,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
  },
});
