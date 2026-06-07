import { Button, Section } from "@lisca/ui-native";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
} from "@lisca/utils";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AlignState } from "../state/use-align-state";
import { VariationExcludeDialog } from "./variation-exclude-dialog";

export function AlignSelectionControls({ state }: { state: AlignState }) {
  const visibleCells = useMemo(
    () =>
      state.frame
        ? enumerateVisibleAlignGridCells(state.frame, state.grid).map(({ i, j }) => ({ i, j }))
        : [],
    [state.frame, state.grid],
  );
  const hasVisibleCells = visibleCells.length > 0;
  const hasExcludedCells = state.currentExcludedCells.length > 0;
  const disabled = state.cropping || !state.frame;

  return (
    <>
      <Section title="Selection">
        <View style={styles.statsRow}>
          <Stat label="Included" value={state.visibleCounts.included} />
          <Stat label="Excluded" value={state.visibleCounts.excluded} />
        </View>
        <Button
          label="Reset"
          variant="outline"
          disabled={disabled || !hasExcludedCells}
          onPress={() => state.setExcludedCellsForCurrentPosition([])}
        />
        <View style={styles.row}>
          <Button
            label="Exclude all"
            variant="outline"
            disabled={disabled || !hasVisibleCells}
            onPress={() => state.setExcludedCellsForCurrentPosition(visibleCells)}
          />
          <Button
            label="Edge exclude"
            variant="outline"
            disabled={disabled || !hasVisibleCells}
            onPress={() => {
              if (!state.frame) return;
              const edgeCells = collectAlignGridEdgeCells(state.frame, state.grid);
              state.setExcludedCellsForCurrentPosition(
                mergeExcludedAlignGridCells(state.currentExcludedCells, edgeCells),
              );
            }}
          />
        </View>
        <View style={styles.row}>
          <Button
            label="Variation exclude"
            variant="outline"
            disabled={disabled || !hasVisibleCells || state.variationExcludeLoading}
            onPress={() => void state.variationExclude()}
          />
          <Button
            label="Auto exclude"
            variant="outline"
            disabled={disabled || !hasVisibleCells || state.variationExcludeLoading}
            onPress={() => void state.autoExclude()}
          />
        </View>
      </Section>
      <VariationExcludeDialog
        state={state.variationExcludePreview}
        onApply={state.applyVariationExclude}
        onCancel={state.cancelVariationExclude}
        onThresholdChange={state.setVariationExcludeThreshold}
      />
    </>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{props.label}</Text>
      <Text style={styles.statValue}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, borderColor: "#e4e4e7" },
  statLabel: { fontSize: 11, color: "#71717a" },
  statValue: { fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});
