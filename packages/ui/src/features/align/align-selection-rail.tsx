import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridFrameBounds,
} from "@lisca/utils";

import { Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { PanelSection } from "../../shell/regions/panel-section";

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
  /** When false, the caller mounts `VariationExcludeDialog` elsewhere (e.g. dock-driven exclude). */
  showVariationExcludeDialog?: boolean;
};

export function AlignSelectionRail(props: AlignSelectionRailProps) {
  const disabled = () => props.disabled ?? false;
  const variationExcludeLoading = () => props.variationExcludeLoading ?? false;
  const smartExcludeLoading = () => props.smartExcludeLoading ?? false;
  const showVariationExcludeDialog = () => props.showVariationExcludeDialog ?? true;

  const visibleCells = () =>
    props.frame
      ? enumerateVisibleAlignGridCells(props.frame, props.grid).map(({ i, j }) => ({
          i,
          j,
        }))
      : [];
  const hasVisibleCells = () => visibleCells().length > 0;
  const hasExcludedCells = () => props.excludedCells.length > 0;

  return (
    <>
      <PanelSection
        class={props.sectionClassName}
        contentClassName={props.sectionContentClassName}
        title="Selection"
      >
        <AlignSelectionCounts
          excluded={props.visibleCounts.excluded}
          included={props.visibleCounts.included}
        />
        <div class="grid w-full grid-cols-2 gap-2">
          <AlignEditToggle
            disabled={disabled()}
            enabled={props.manualExclusionEnabled}
            onEnabledChange={props.onManualExclusionEnabledChange}
          />
          <Button
            class="w-full justify-center text-xs"
            disabled={disabled() || !hasExcludedCells()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => props.onExcludedCellsChange([])}
          >
            Reset
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Button
            disabled={disabled() || !hasVisibleCells()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => props.onExcludedCellsChange(visibleCells())}
          >
            Exclude all
          </Button>
          <Button
            disabled={disabled() || !hasVisibleCells()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              if (!props.frame) return;
              props.onExcludedCellsChange(
                mergeExcludedAlignGridCells(
                  props.excludedCells,
                  collectAlignGridEdgeCells(props.frame, props.grid),
                ),
              );
            }}
          >
            Edge exclude
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Button
            disabled={disabled() || !hasVisibleCells() || variationExcludeLoading()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void props.onVariationExclude()}
          >
            Var exclude
          </Button>
          <Button
            disabled={
              disabled() || !hasVisibleCells() || variationExcludeLoading() || smartExcludeLoading()
            }
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void props.onSmartExclude()}
          >
            Smart exclude
          </Button>
        </div>
      </PanelSection>
      <Show when={showVariationExcludeDialog()}>
        <VariationExcludeDialog
          state={props.variationExcludePreview}
          onApply={props.onApplyVariationExclude}
          onCancel={props.onCancelVariationExclude}
          onThresholdChange={props.onVariationExcludeThresholdChange}
        />
      </Show>
    </>
  );
}