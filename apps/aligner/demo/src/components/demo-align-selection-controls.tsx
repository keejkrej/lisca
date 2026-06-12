import { AlignSelectionRail } from "@lisca/ui/features";
import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignSelectionControls({ state }: { state: DemoAlignState }) {
  return (
    <AlignSelectionRail
      disabled={!state.frame}
      excludedCells={state.excludedCells}
      frame={state.frame}
      grid={state.grid}
      manualExclusionEnabled={state.manualExclusionEnabled}
      visibleCounts={state.visibleCounts}
      variationExcludeLoading={state.variationExcludeLoading}
      variationExcludePreview={state.variationExcludePreview}
      onApplyVariationExclude={state.applyVariationExclude}
      onAutoExclude={() => void state.autoExclude()}
      onCancelVariationExclude={state.cancelVariationExclude}
      onExcludedCellsChange={state.setExcludedCells}
      onManualExclusionEnabledChange={state.setManualExclusionEnabled}
      onVariationExclude={() => void state.variationExclude()}
      onVariationExcludeThresholdChange={state.setVariationExcludeThreshold}
    />
  );
}
