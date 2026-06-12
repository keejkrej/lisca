import { AlignSelectionRail } from "@lisca/ui/features";

import { useAlignPage } from "../state/align-page-context";

export function AlignSelectionControls() {
  const { state } = useAlignPage();
  const disabled = state.cropping || !state.frame;

  return (
    <AlignSelectionRail
      disabled={disabled}
      excludedCells={state.currentExcludedCells}
      frame={state.frame}
      grid={state.grid}
      manualExclusionEnabled={state.manualExclusionEnabled}
      visibleCounts={state.visibleCounts}
      variationExcludeLoading={state.variationExcludeLoading}
      variationExcludePreview={state.variationExcludePreview}
      onApplyVariationExclude={state.applyVariationExclude}
      onAutoExclude={() => void state.autoExclude()}
      onCancelVariationExclude={state.cancelVariationExclude}
      onExcludedCellsChange={(cells) => state.setExcludedCellsForCurrentPosition(cells)}
      onManualExclusionEnabledChange={state.setManualExclusionEnabled}
      onVariationExclude={() => void state.variationExclude()}
      onVariationExcludeThresholdChange={state.setVariationExcludeThreshold}
    />
  );
}
