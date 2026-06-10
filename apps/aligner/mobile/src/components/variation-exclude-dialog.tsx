import {
  deriveVariationExcludePreview,
  formatVariationScore,
  nextVariationExcludeThreshold,
} from "@lisca/ui-headless/variation-exclude-preview";
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
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { VariationExcludePreview } from "../state/use-align-state";

type VariationExcludeDialogProps = {
  state: VariationExcludePreview | null;
  onApply: () => void;
  onCancel: () => void;
  onThresholdChange: (threshold: number) => void;
};

export function VariationExcludeDialog({
  state,
  onApply,
  onCancel,
  onThresholdChange,
}: VariationExcludeDialogProps) {
  const { colors } = useShellTheme();
  const derived = deriveVariationExcludePreview(state);
  if (!derived) return null;
  const { preview, threshold, selectedCount, metrics } = derived;
  const setThreshold = (value: number) => {
    const next = nextVariationExcludeThreshold(state, value);
    if (next != null) onThresholdChange(next);
  };

  return (
    <ModalScrim open={true} onClose={onCancel}>
      <DialogSurface maxWidth={640} padded={false}>
        <DialogHeader>
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
              },
            ]}
          >
            Var exclude
          </Text>
        </DialogHeader>

        <DialogBody>
          <View style={styles.statsRow}>
            <StatTile label="Eligible cells" value={preview.eligibleCellCount} />
            <StatTile label="Selected cells" value={selectedCount} />
            <StatTile
              label="Score range"
              value={`${formatVariationScore(preview.scoreMin)} - ${formatVariationScore(preview.scoreMax)}`}
            />
          </View>

          <VariationScoreHistogram bins={preview.histogramBins} threshold={threshold} />

          <View style={styles.thresholdRow}>
            <View style={styles.thresholdSlider}>
              <View style={styles.thresholdHeader}>
                <Text
                  style={[
                    styles.thresholdLabel,
                    {
                      color: colors.foreground,
                    },
                  ]}
                >
                  Threshold
                </Text>
                <Text
                  style={[
                    styles.thresholdValue,
                    {
                      color: colors.mutedForeground,
                    },
                  ]}
                >
                  {formatVariationScore(threshold)}
                </Text>
              </View>
              <Slider
                maximumValue={metrics.max}
                minimumValue={metrics.min}
                step={metrics.step}
                style={styles.slider}
                thumbTintColor={colors.primary}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                value={threshold}
                onSlidingComplete={setThreshold}
                onValueChange={setThreshold}
              />
            </View>
            <TextInput
              keyboardType="decimal-pad"
              value={String(threshold)}
              onChangeText={(text) => setThreshold(Number(text))}
              style={[
                styles.input,
                {
                  borderColor: colors.input,
                  color: colors.foreground,
                  backgroundColor: colors.controlSurface,
                },
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
