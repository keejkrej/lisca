import { Button, Section, StatTile } from "@lisca/ui-native";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
} from "@lisca/utils";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

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
      <Section contentStyle={styles.sectionContent} style={styles.section} title="Selection">
        <View style={styles.statsRow}>
          <StatTile centered label="Included cells" value={state.visibleCounts.included} />
          <StatTile centered label="Excluded cells" value={state.visibleCounts.excluded} />
        </View>
        <View style={styles.gridCell}>
          <Button
            disabled={disabled || !hasExcludedCells}
            label="Reset"
            size="sm"
            style={styles.fullWidthButton}
            variant="outline"
            onPress={() => state.setExcludedCellsForCurrentPosition([])}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.gridCell}>
            <Button
              disabled={disabled || !hasVisibleCells}
              label="Exclude all"
              size="sm"
              style={styles.fullWidthButton}
              variant="outline"
              onPress={() => state.setExcludedCellsForCurrentPosition(visibleCells)}
            />
          </View>
          <View style={styles.gridCell}>
            <Button
              disabled={disabled || !hasVisibleCells}
              label="Edge exclude"
              size="sm"
              style={styles.fullWidthButton}
              variant="outline"
              onPress={() => {
                if (!state.frame) return;
                const edgeCells = collectAlignGridEdgeCells(state.frame, state.grid);
                state.setExcludedCellsForCurrentPosition(
                  mergeExcludedAlignGridCells(state.currentExcludedCells, edgeCells),
                );
              }}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.gridCell}>
            <Button
              disabled={disabled || !hasVisibleCells || state.variationExcludeLoading}
              label="Var exclude"
              loading={state.variationExcludeLoading}
              size="sm"
              style={styles.fullWidthButton}
              variant="outline"
              onPress={() => void state.variationExclude()}
            />
          </View>
          <View style={styles.gridCell}>
            <Button
              disabled={disabled || !hasVisibleCells || state.variationExcludeLoading}
              label="Auto exclude"
              loading={state.variationExcludeLoading}
              size="sm"
              style={styles.fullWidthButton}
              variant="outline"
              onPress={() => void state.autoExclude()}
            />
          </View>
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

const styles = StyleSheet.create({
  section: {
    flexShrink: 0,
  },
  sectionContent: {
    gap: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  fullWidthButton: {
    alignSelf: "stretch",
    width: "100%",
  },
});
