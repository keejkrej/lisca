import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridFrameBounds,
} from "@lisca/utils";
import { ActivityIndicator, View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
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

function LoadingButton(props: {
  children: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onPress?: () => void;
}) {
  return (
    <Button
      className={props.className ?? "w-full justify-center text-xs"}
      disabled={props.disabled || props.loading}
      size="sm"
      variant="outline"
      onPress={props.onPress}
    >
      {props.loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <Text className="text-xs">{props.children}</Text>
      )}
    </Button>
  );
}

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
        <View className="grid w-full grid-cols-2 gap-2">
          <AlignEditToggle
            disabled={disabled}
            enabled={manualExclusionEnabled}
            onEnabledChange={onManualExclusionEnabledChange}
          />
          <Button
            className="w-full justify-center text-xs"
            disabled={disabled || !hasExcludedCells}
            size="sm"
            variant="outline"
            onPress={() => onExcludedCellsChange([])}
          >
            <Text className="text-xs">Reset</Text>
          </Button>
        </View>
        <View className="grid grid-cols-2 gap-2">
          <Button
            className="w-full justify-center text-xs"
            disabled={disabled || !hasVisibleCells}
            size="sm"
            variant="outline"
            onPress={() => onExcludedCellsChange(visibleCells)}
          >
            <Text className="text-xs">Exclude all</Text>
          </Button>
          <Button
            className="w-full justify-center text-xs"
            disabled={disabled || !hasVisibleCells}
            size="sm"
            variant="outline"
            onPress={() => {
              if (!frame) return;
              onExcludedCellsChange(
                mergeExcludedAlignGridCells(excludedCells, collectAlignGridEdgeCells(frame, grid)),
              );
            }}
          >
            <Text className="text-xs">Edge exclude</Text>
          </Button>
        </View>
        <View className="grid grid-cols-2 gap-2">
          <LoadingButton
            disabled={disabled || !hasVisibleCells}
            loading={variationExcludeLoading}
            onPress={() => void onVariationExclude()}
          >
            Var exclude
          </LoadingButton>
          <LoadingButton
            disabled={disabled || !hasVisibleCells || variationExcludeLoading}
            loading={smartExcludeLoading}
            onPress={() => void onSmartExclude()}
          >
            Smart exclude
          </LoadingButton>
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
