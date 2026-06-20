"use client";

import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridFrameBounds,
} from "@lisca/utils";

import { Button } from "../../components/ui/button";
import { SidebarSection } from "../../shell/regions/sidebar-section";

import { AlignEditToggle } from "./align-edit-toggle";
import { AlignSelectionCounts } from "./align-selection-counts";
import {
  VariationExcludeDialog,
  type VariationExcludePreviewState,
} from "./variation-exclude-dialog";

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
        <div className="grid w-full grid-cols-2 gap-2">
          <AlignEditToggle
            disabled={disabled}
            enabled={manualExclusionEnabled}
            onEnabledChange={onManualExclusionEnabledChange}
          />
          <Button
            className="w-full justify-center text-xs"
            disabled={disabled || !hasExcludedCells}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onExcludedCellsChange([])}
          >
            Reset
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={disabled || !hasVisibleCells}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onExcludedCellsChange(visibleCells)}
          >
            Exclude all
          </Button>
          <Button
            disabled={disabled || !hasVisibleCells}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              if (!frame) return;
              onExcludedCellsChange(
                mergeExcludedAlignGridCells(excludedCells, collectAlignGridEdgeCells(frame, grid)),
              );
            }}
          >
            Edge exclude
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={disabled || !hasVisibleCells || variationExcludeLoading}
            loading={variationExcludeLoading}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void onVariationExclude()}
          >
            Var exclude
          </Button>
          <Button
            disabled={
              disabled || !hasVisibleCells || variationExcludeLoading || smartExcludeLoading
            }
            loading={smartExcludeLoading}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void onSmartExclude()}
          >
            Smart exclude
          </Button>
        </div>
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
