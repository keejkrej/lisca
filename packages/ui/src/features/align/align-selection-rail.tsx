import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import {
  collectAlignGridEdgePatterns,
  enumerateVisibleAlignGridPatterns,
  mergeExcludedAlignGridPatterns,
  type AlignGridFrameBounds,
} from "@lisca/utils";

import { Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { ComingSoonTooltip } from "../../components/ui/coming-soon-tooltip";
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
  excludedPatterns: AlignGridPatternCoord[];
  visibleCounts: {
    included: number;
    excluded: number;
  };
  manualExclusionEnabled: boolean;
  onManualExclusionEnabledChange: (enabled: boolean) => void;
  onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) => void;
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

  const visiblePatterns = () =>
    props.frame
      ? enumerateVisibleAlignGridPatterns(props.frame, props.grid).map(({ i, j }) => ({
          i,
          j,
        }))
      : [];
  const hasVisiblePatterns = () => visiblePatterns().length > 0;
  const hasExcludedPatterns = () => props.excludedPatterns.length > 0;

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
      disabled={disabled() || !hasExcludedPatterns()}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => props.onExcludedPatternsChange([])}
    >
      Reset
    </Button>
  );
  const ExcludeAllControl = () => (
    <Button
      class="w-full justify-center text-xs"
      disabled={disabled() || !hasVisiblePatterns()}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => props.onExcludedPatternsChange(visiblePatterns())}
    >
      Exclude all
    </Button>
  );
  const EdgeExcludeControl = () => (
    <Button
      class="w-full justify-center text-xs"
      disabled={disabled() || !hasVisiblePatterns()}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => {
        if (!props.frame) return;
        props.onExcludedPatternsChange(
          mergeExcludedAlignGridPatterns(
            props.excludedPatterns,
            collectAlignGridEdgePatterns(props.frame, props.grid),
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
      disabled={disabled() || !hasVisiblePatterns() || variationExcludeLoading()}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => void props.onVariationExclude()}
    >
      Log-std exclude
    </Button>
  );
  const SmartExcludeControl = () => (
    <ComingSoonTooltip class="flex w-full">
      <Button
        class="pointer-events-none h-auto w-full justify-center text-xs"
        data-unavailable=""
        disabled
        size="sm"
        type="button"
        variant="outline"
      >
        Smart exclude
      </Button>
    </ComingSoonTooltip>
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
