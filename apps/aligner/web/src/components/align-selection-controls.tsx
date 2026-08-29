import { runClientEffect } from "@lisca/client/runtime";
import { createRequestSmartExcludeProvider, useSmartExclude } from "@lisca/smart/exclude/request";
import { useVarExclude } from "@lisca/smart/var-exclude";
import { createLocalVarExcludeProvider } from "@lisca/smart/var-exclude/local";
import { AlignSelectionRail } from "@lisca/ui/features";
import { createMemo } from "solid-js";

import { alignerClient } from "../api/aligner-port";
import { useAlignPage } from "../state/align-page-context";

export function AlignSelectionControls() {
  const { state } = useAlignPage();
  const smartExcludeProvider = createRequestSmartExcludeProvider(
    {
      smartExclude: (request, signal) =>
        runClientEffect(alignerClient.smartExclude(request), signal ? { signal } : undefined),
    },
    {
      source: () => state().source,
      selection: () => state().selection,
      contrast: () => state().contrast,
    },
  );
  const disabled = createMemo(() => !state().frame);
  const varExclude = useVarExclude({
    provider: createLocalVarExcludeProvider(),
    frame: () => state().frame,
    grid: () => state().grid,
    currentExcludedCells: () => state().currentExcludedCells,
    enabled: () => !disabled(),
    onPreview: (preview) => state().showVariationExcludePreview(preview),
    onError: (error) => state().reportError(error),
  });
  const smartExclude = useSmartExclude({
    provider: smartExcludeProvider,
    frame: () => state().frame,
    grid: () => state().grid,
    currentExcludedCells: () => state().currentExcludedCells,
    enabled: () => !disabled(),
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
        sectionAppearance="rail"
        smartExcludeLoading={smartExclude.active()}
        visibleCounts={state().visibleCounts}
        variationExcludeLoading={varExclude.active()}
        variationExcludePreview={state().variationExcludePreview}
        onApplyVariationExclude={() => state().applyVariationExclude()}
        onSmartExclude={() => void smartExclude.request()}
        onCancelVariationExclude={() => state().cancelVariationExclude()}
        onExcludedCellsChange={(cells) => state().setExcludedCellsForCurrentPosition(cells)}
        onManualExclusionEnabledChange={(enabled) => state().setManualExclusionEnabled(enabled)}
        onVariationExclude={() => void varExclude.requestPreview()}
        onVariationExcludeThresholdChange={(threshold) =>
          state().setVariationExcludeThreshold(threshold)
        }
      />
    </>
  );
}
