import { AlignSelectionRail, SmartExcludeModelDialog } from "@lisca/ui/features";
import { useSmartExclude } from "@lisca/smart/exclude/browser";
import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignSelectionControls({ state }: { state: DemoAlignState }) {
  const disabled = !state.frame;
  const smartExclude = useSmartExclude({
    frame: state.frame,
    grid: state.grid,
    currentExcludedCells: state.excludedCells,
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
        excludedCells={state.excludedCells}
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
        onExcludedCellsChange={state.setExcludedCells}
        onManualExclusionEnabledChange={state.setManualExclusionEnabled}
        onVariationExclude={() => void state.variationExclude()}
        onVariationExcludeThresholdChange={state.setVariationExcludeThreshold}
      />
    </>
  );
}
