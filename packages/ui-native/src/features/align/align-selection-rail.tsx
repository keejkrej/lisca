import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridFrameBounds,
} from "@lisca/utils";
import { View } from "react-native";

import { Button } from "../../shell/chrome/buttons";
import { SidebarSection } from "../../shell/regions/sidebar-section";

import { AlignEditToggle } from "./align-edit-toggle";
import { AlignSelectionCounts } from "./align-selection-counts";
import { VariationExcludeDialog, type VariationExcludePreviewState } from "./variation-exclude-dialog";

export type AlignSelectionRailProps = {
  disabled?: boolean;
  frame: AlignGridFrameBounds | null;
  grid: AlignGridState;
  excludedCells: AlignGridCellCoord[];
  visibleCounts: {
    included: number;
    excluded: number;
  };
  manualExclusionEnabled: boolean;
  onManualExclusionEnabledChange: (enabled: boolean) => void;
  onExcludedCellsChange: (cells: AlignGridCellCoord[]) => void;
  variationExcludePreview: VariationExcludePreviewState;
  variationExcludeLoading?: boolean;
  onVariationExclude: () => void | Promise<void>;
  onSmartExclude: () => void | Promise<void>;
  smartExcludeLoading?: boolean;
  onApplyVariationExclude: () => void;
  onCancelVariationExclude: () => void;
  onVariationExcludeThresholdChange: (threshold: number) => void;
  sectionClassName?: string;
  sectionContentClassName?: string;
};

export function AlignSelectionRail({
  disabled = false,
  excludedCells,
  frame,
  grid,
  manualExclusionEnabled,
  onApplyVariationExclude,
  onSmartExclude,
  smartExcludeLoading = false,
  onCancelVariationExclude,
  onExcludedCellsChange,
  onManualExclusionEnabledChange,
  onVariationExclude,
  onVariationExcludeThresholdChange,
  sectionClassName,
  sectionContentClassName,
  variationExcludeLoading = false,
  variationExcludePreview,
  visibleCounts,
}: AlignSelectionRailProps) {
  const visibleCells = frame
    ? enumerateVisibleAlignGridCells(frame, grid).map(({ i, j }) => ({
        i,
        j,
      }))
    : [];
  const hasVisibleCells = visibleCells.length > 0;
  const hasExcludedCells = excludedCells.length > 0;

  return (
    <>
      <SidebarSection
        className={sectionClassName}
        contentClassName={sectionContentClassName}
        title="Selection"
      >
        <AlignSelectionCounts excluded={visibleCounts.excluded} included={visibleCounts.included} />
        <View className="flex-row gap-2">
          <AlignEditToggle
            disabled={disabled}
            enabled={manualExclusionEnabled}
            onEnabledChange={onManualExclusionEnabledChange}
          />
          <Button
            className="min-w-0 flex-1"
            disabled={disabled || !hasExcludedCells}
            label="Reset"
            size="sm"
            variant="outline"
            onPress={() => onExcludedCellsChange([])}
          />
        </View>
        <View className="flex-row gap-2">
          <Button
            className="min-w-0 flex-1"
            disabled={disabled || !hasVisibleCells}
            label="Exclude all"
            size="sm"
            variant="outline"
            onPress={() => onExcludedCellsChange(visibleCells)}
          />
          <Button
            className="min-w-0 flex-1"
            disabled={disabled || !hasVisibleCells}
            label="Edge exclude"
            size="sm"
            variant="outline"
            onPress={() => {
              if (!frame) return;
              onExcludedCellsChange(
                mergeExcludedAlignGridCells(excludedCells, collectAlignGridEdgeCells(frame, grid)),
              );
            }}
          />
        </View>
        <View className="flex-row gap-2">
          <Button
            className="min-w-0 flex-1"
            disabled={disabled || !hasVisibleCells || variationExcludeLoading}
            label="Var exclude"
            loading={variationExcludeLoading}
            size="sm"
            variant="outline"
            onPress={() => void onVariationExclude()}
          />
          <Button
            className="min-w-0 flex-1"
            disabled={disabled || !hasVisibleCells || variationExcludeLoading || smartExcludeLoading}
            label="Smart exclude"
            loading={smartExcludeLoading}
            size="sm"
            variant="outline"
            onPress={() => void onSmartExclude()}
          />
        </View>
      </SidebarSection>
      <VariationExcludeDialog
        state={variationExcludePreview}
        onApply={onApplyVariationExclude}
        onCancel={onCancelVariationExclude}
        onThresholdChange={onVariationExcludeThresholdChange}
      />
    </>
  );
}
