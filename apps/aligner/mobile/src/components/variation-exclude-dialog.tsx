import Slider from "@react-native-community/slider";
import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button, DialogSurface, ModalScrim } from "@lisca/ui-native";

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
  const preview = state?.preview ?? null;
  const threshold = state?.threshold ?? 0;
  const selectedCount = useMemo(
    () => preview?.cellScores.filter((cell) => cell.score <= threshold).length ?? 0,
    [preview, threshold],
  );

  if (!preview) return null;

  const min = preview.scoreMin;
  const max = preview.scoreMax > preview.scoreMin ? preview.scoreMax : preview.scoreMin + 1;

  return (
    <ModalScrim open onClose={onCancel}>
      <DialogSurface maxWidth={520}>
        <Text style={styles.title}>Variation exclude</Text>
        <View style={styles.stats}>
          <Text>Eligible: {preview.eligibleCellCount}</Text>
          <Text>Selected: {selectedCount}</Text>
          <Text>
            Range: {formatScore(preview.scoreMin)} - {formatScore(preview.scoreMax)}
          </Text>
        </View>
        <Slider
          minimumValue={min}
          maximumValue={max}
          value={threshold}
          onSlidingComplete={(value) => onThresholdChange(clampThreshold(value, min, max))}
        />
        <TextInput
          keyboardType="decimal-pad"
          value={String(threshold)}
          onChangeText={(text) => onThresholdChange(clampThreshold(Number(text), min, max))}
          style={styles.input}
        />
        <View style={styles.actions}>
          <Button label="Cancel" variant="outline" onPress={onCancel} />
          <Button label="Apply" onPress={onApply} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "600" },
  stats: { gap: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, borderColor: "#e4e4e7" },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
});
