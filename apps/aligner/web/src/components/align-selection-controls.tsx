import { runClientEffect } from "@lisca/client/runtime";
import { createRequestSmartExcludeProvider, useSmartExclude } from "@lisca/smart/exclude/request";
import { AlignSelectionRail } from "@lisca/ui/features";
import { createMemo } from "solid-js";

import { alignerClient } from "../api/aligner-port";
import { useAlignPage } from "../state/align-page-context";

const smartExcludeProvider = createRequestSmartExcludeProvider({
  smartExclude: (request, signal) =>
    runClientEffect(alignerClient.smartExclude(request, signal), signal ? { signal } : undefined),
});

export function AlignSelectionControls() {
  const { state } = useAlignPage();
  const disabled = createMemo(() => state().cropping || !state().frame);
  const smartExclude = useSmartExclude({
    provider: smartExcludeProvider,
    get frame() {
      return state().frame;
    },
    get grid() {
      return state().grid;
    },
    get currentExcludedCells() {
      return state().currentExcludedCells;
    },
    get enabled() {
      return !disabled();
    },
    onComplete: (cells) => state().applySmartExclusion(cells),
    onError: (error) => state().reportError(error),
  });

  return (
    <>
      <AlignSelectionRail
        disabled={disabled()}
        excludedCells={state().currentExcludedCells}
        frame={state().frame}
        grid={state().grid}
        manualExclusionEnabled={state().manualExclusionEnabled}
        smartExcludeLoading={smartExclude.active()}
        visibleCounts={state().visibleCounts}
        variationExcludeLoading={state().variationExcludeLoading}
        variationExcludePreview={state().variationExcludePreview}
        onApplyVariationExclude={() => state().applyVariationExclude()}
        onSmartExclude={() => void smartExclude.request()}
        onCancelVariationExclude={() => state().cancelVariationExclude()}
        onExcludedCellsChange={(cells) => state().setExcludedCellsForCurrentPosition(cells)}
        onManualExclusionEnabledChange={(enabled) => state().setManualExclusionEnabled(enabled)}
        onVariationExclude={() => void state().variationExclude()}
        onVariationExcludeThresholdChange={(threshold) =>
          state().setVariationExcludeThreshold(threshold)
        }
      />
    </>
  );
}