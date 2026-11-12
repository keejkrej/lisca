import { useVarExclude } from "@lisca/smart/var-exclude";
import { createLocalVarExcludeProvider } from "@lisca/smart/var-exclude/local";
import { AlignSelectionRail } from "@lisca/instrument";
import { createMemo } from "solid-js";

import { useAlignPage } from "../state/align-page-context";

export function AlignSelectionControls() {
  const { state } = useAlignPage();
  const disabled = createMemo(() => !state().frame);
  const varExclude = useVarExclude({
    provider: createLocalVarExcludeProvider(),
    frame: () => state().frame,
    grid: () => state().effectiveGrid,
    currentExcludedPatterns: () => state().currentExcludedPatterns,
    enabled: () => !disabled(),
    onPreview: (preview) => state().showVariationExcludePreview(preview),
    onError: (error) => state().reportError(error),
  });

  return (
    <AlignSelectionRail
      disabled={disabled()}
      excludedPatterns={state().currentExcludedPatterns}
      frame={state().frame}
      grid={state().effectiveGrid}
      manualExclusionEnabled={state().manualExclusionEnabled}
      sectionAppearance="rail"
      visibleCounts={state().visibleCounts}
      variationExcludeLoading={varExclude.active()}
      variationExcludePreview={state().variationExcludePreview}
      onApplyVariationExclude={() => state().applyVariationExclude()}
      onCancelVariationExclude={() => state().cancelVariationExclude()}
      onExcludedPatternsChange={(patterns) =>
        state().setExcludedPatternsForCurrentPosition(patterns)
      }
      onManualExclusionEnabledChange={(enabled) => state().setManualExclusionEnabled(enabled)}
      onVariationExclude={() => void varExclude.requestPreview()}
      onVariationExcludeThresholdChange={(threshold) =>
        state().setVariationExcludeThreshold(threshold)
      }
    />
  );
}
