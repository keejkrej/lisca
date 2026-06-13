import { Button, Section, StatTile } from "@lisca/ui-native";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
} from "@lisca/utils";
import { View } from "react-native";

import type { AlignState } from "../state/use-align-state";
import { VariationExcludeDialog } from "./variation-exclude-dialog";

export function AlignSelectionControls({ state }: { state: AlignState }) {
  const visibleCells = state.frame
    ? enumerateVisibleAlignGridCells(state.frame, state.grid).map(({ i, j }) => ({
        i,
        j,
      }))
    : [];
  const hasVisibleCells = visibleCells.length > 0;
  const hasExcludedCells = state.currentExcludedCells.length > 0;
  const disabled = state.cropping || !state.frame;

  return (
    <>
      <Section className="shrink-0" contentClassName="gap-2" title="Selection">
        <View className="flex-row gap-2">
          <StatTile centered label="Included cells" value={state.visibleCounts.included} />
          <StatTile centered label="Excluded cells" value={state.visibleCounts.excluded} />
        </View>
        <View className="min-w-0 flex-1">
          <Button
            className="w-full self-stretch"
            disabled={disabled || !hasExcludedCells}
            label="Reset"
            size="sm"
            variant="outline"
            onPress={() => state.setExcludedCellsForCurrentPosition([])}
          />
        </View>
        <View className="flex-row gap-2">
          <View className="min-w-0 flex-1">
            <Button
              className="w-full self-stretch"
              disabled={disabled || !hasVisibleCells}
              label="Exclude all"
              size="sm"
              variant="outline"
              onPress={() => state.setExcludedCellsForCurrentPosition(visibleCells)}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Button
              className="w-full self-stretch"
              disabled={disabled || !hasVisibleCells}
              label="Edge exclude"
              size="sm"
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
        <View className="flex-row gap-2">
          <View className="min-w-0 flex-1">
            <Button
              className="w-full self-stretch"
              disabled={disabled || !hasVisibleCells || state.variationExcludeLoading}
              label="Var exclude"
              loading={state.variationExcludeLoading}
              size="sm"
              variant="outline"
              onPress={() => void state.variationExclude()}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Button
              className="w-full self-stretch"
              disabled={disabled || !hasVisibleCells || state.variationExcludeLoading}
              label="Auto exclude"
              loading={state.variationExcludeLoading}
              size="sm"
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
