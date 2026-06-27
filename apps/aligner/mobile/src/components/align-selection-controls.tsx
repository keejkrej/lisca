import { AlignSelectionRail, SmartExcludeModelDialog } from "@lisca/ui-native";
import { useSmartExclude } from "@lisca/smart/exclude/browser";

import { useAlignPage } from "../state/align-page-context";

export function AlignSelectionControls() {
  const { state } = useAlignPage();
  const disabled = state.cropping || !state.frame;
  const smartExclude = useSmartExclude({
    frame: state.frame,
    grid: state.grid,
    currentExcludedCells: state.currentExcludedCells,
    enabled: !disabled,
    onComplete: state.applySmartExclusion,
    onError: state.reportError,
  });

  return (
    <>
      <SmartExcludeModelDialog
        busy={smartExclude.busy}
        state={smartExclude.downloadState}
        onCancel={smartExclude.cancelDownload}
        onConfirm={() => void smartExclude.confirmDownload()}
      />
      <AlignSelectionRail
        disabled={disabled}
        excludedCells={state.currentExcludedCells}
        frame={state.frame}
        grid={state.grid}
        manualExclusionEnabled={state.manualExclusionEnabled}
        smartExcludeLoading={smartExclude.active}
        visibleCounts={state.visibleCounts}
        variationExcludeLoading={state.variationExcludeLoading}
        variationExcludePreview={state.variationExcludePreview}
        onApplyVariationExclude={state.applyVariationExclude}
        onSmartExclude={() => void smartExclude.request()}
        onCancelVariationExclude={state.cancelVariationExclude}
        onExcludedCellsChange={(cells) => state.setExcludedCellsForCurrentPosition(cells)}
        onManualExclusionEnabledChange={state.setManualExclusionEnabled}
        onVariationExclude={() => void state.variationExclude()}
        onVariationExcludeThresholdChange={state.setVariationExcludeThreshold}
      />
    </>
  );
}
