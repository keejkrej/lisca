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
import { RailActionPair } from "../../shell/regions/rail-control-layout";

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
  sectionAppearance?: "framed" | "rail";
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

  const EditControl = () => (
    <AlignEditToggle
      disabled={disabled()}
      enabled={props.manualExclusionEnabled}
      onEnabledChange={props.onManualExclusionEnabledChange}
    />
  );
  const ResetControl = () => (
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
  );
  const ExcludeAllControl = () => (
    <Button
      class="w-full justify-center text-xs"
      disabled={disabled() || !hasVisibleCells()}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => props.onExcludedCellsChange(visibleCells())}
    >
      Exclude all
    </Button>
  );
  const EdgeExcludeControl = () => (
    <Button
      class="w-full justify-center text-xs"
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
  );
  const VariationExcludeControl = () => (
    <Button
      class="w-full justify-center text-xs"
      disabled={disabled() || !hasVisibleCells() || variationExcludeLoading()}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => void props.onVariationExclude()}
    >
      Var exclude
    </Button>
  );
  const SmartExcludeControl = () => (
    <Button
      class="w-full justify-center text-xs"
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
  );

  return (
    <>
      <PanelSection
        appearance={props.sectionAppearance}
        class={props.sectionClassName}
        contentClassName={props.sectionContentClassName}
        title="Selection"
      >
        <Show when={props.sectionAppearance !== "rail"}>
          <AlignSelectionCounts
            excluded={props.visibleCounts.excluded}
            included={props.visibleCounts.included}
          />
        </Show>
        <Show
          when={props.sectionAppearance === "rail"}
          fallback={
            <>
              <div class="grid w-full grid-cols-2 gap-2">
                <EditControl />
                <ResetControl />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <ExcludeAllControl />
                <EdgeExcludeControl />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <VariationExcludeControl />
                <SmartExcludeControl />
              </div>
            </>
          }
        >
          <div class="flex w-full min-w-0 flex-col gap-2">
            <RailActionPair label="Selection editing">
              <EditControl />
              <ResetControl />
            </RailActionPair>
            <RailActionPair label="Bulk exclusion">
              <ExcludeAllControl />
              <EdgeExcludeControl />
            </RailActionPair>
            <RailActionPair label="Assisted exclusion">
              <VariationExcludeControl />
              <SmartExcludeControl />
            </RailActionPair>
          </div>
        </Show>
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
