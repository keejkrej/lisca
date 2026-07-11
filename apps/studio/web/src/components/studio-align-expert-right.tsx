import { AlignGridRail, AlignSelectionRail } from "@lisca/ui/features";
import { SidebarStack } from "@lisca/ui/shell";
import { onCleanup } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignExpertRight() {
  const { state, smartExclude } = useStudioAlignPage();
  const disabled = () => state.cropping || !state.frame;

  onCleanup(() => {
    state.setManualExclusionEnabled(false);
    state.cancelVariationExclude();
  });

  return (
    <SidebarStack>
      <AlignGridRail disabled={disabled()} grid={state.grid} onGridChange={state.setGrid} />
      <AlignSelectionRail
        disabled={disabled()}
        excludedCells={state.currentExcludedCells}
        frame={state.frame}
        grid={state.grid}
        manualExclusionEnabled={state.manualExclusionEnabled}
        smartExcludeLoading={smartExclude.active()}
        visibleCounts={state.visibleCounts}
        variationExcludeLoading={state.variationExcludeLoading}
        variationExcludePreview={state.variationExcludePreview}
        onApplyVariationExclude={() => state.applyVariationExclude()}
        onCancelVariationExclude={() => state.cancelVariationExclude()}
        onExcludedCellsChange={(cells) => state.setExcludedCellsForCurrentPosition(cells)}
        onManualExclusionEnabledChange={(enabled) => state.setManualExclusionEnabled(enabled)}
        onSmartExclude={() => void smartExclude.request()}
        onVariationExclude={() => void state.variationExclude()}
        onVariationExcludeThresholdChange={(threshold) =>
          state.setVariationExcludeThreshold(threshold)
        }
      />
    </SidebarStack>
  );
}
