import { VariationExcludeDialog } from "@lisca/ui/features";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignVariationExcludeDialog() {
  const { state, applyExcludePreview, cancelExcludePreview } = useStudioAlignPage();

  return (
    <VariationExcludeDialog
      state={state.variationExcludePreview}
      onApply={applyExcludePreview}
      onCancel={cancelExcludePreview}
      onThresholdChange={(threshold) => state.setVariationExcludeThreshold(threshold)}
    />
  );
}
