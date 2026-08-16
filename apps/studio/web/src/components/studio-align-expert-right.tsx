import { AlignGridRail, AlignSelectionRail } from "@lisca/ui/features";
import { onCleanup } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignExpertRight() {
  const { state, smartExclude, varExclude, requestExpertVarExclude } = useStudioAlignPage();
  const disabled = () => !state.frame;

  onCleanup(() => {
    state.setManualExclusionEnabled(false);
    state.cancelVariationExclude();
  });

  return (
    <>
      <AlignGridRail
        disabled={disabled()}
        grid={state.grid}
        sectionAppearance="rail"
        onGridChange={state.setGrid}
      />
      <AlignSelectionRail
        disabled={disabled()}
        excludedCells={state.currentExcludedCells}
        frame={state.frame}
        grid={state.grid}
        manualExclusionEnabled={state.manualExclusionEnabled}
        sectionAppearance="rail"
        smartExcludeLoading={smartExclude.active()}
        visibleCounts={state.visibleCounts}
        variationExcludeLoading={varExclude.active()}
        variationExcludePreview={state.variationExcludePreview}
        onApplyVariationExclude={() => state.applyVariationExclude()}
        onCancelVariationExclude={() => state.cancelVariationExclude()}
        onExcludedCellsChange={(cells) => state.setExcludedCellsForCurrentPosition(cells)}
        onManualExclusionEnabledChange={(enabled) => state.setManualExclusionEnabled(enabled)}
        onSmartExclude={() => void smartExclude.request()}
        onVariationExclude={() => void requestExpertVarExclude()}
        onVariationExcludeThresholdChange={(threshold) =>
          state.setVariationExcludeThreshold(threshold)
        }
        showVariationExcludeDialog={false}
      />
    </>
  );
}
