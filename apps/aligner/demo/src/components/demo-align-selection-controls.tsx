import { AlignSelectionCounts, VariationExcludeDialog } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { SidebarSection } from "@lisca/ui/shell";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignSelectionControls({ state }: { state: DemoAlignState }) {
  const disabled = !state.frame;
  const hasVisibleCells = state.visibleCounts.included + state.visibleCounts.excluded > 0;
  const hasExcludedCells = state.excludedCells.length > 0;

  return (
    <>
      <SidebarSection title="Selection">
        <AlignSelectionCounts
          excluded={state.visibleCounts.excluded}
          included={state.visibleCounts.included}
        />
        <Button
          className="w-full"
          disabled={disabled || !hasExcludedCells}
          size="sm"
          type="button"
          variant="outline"
          onClick={state.resetExcludedCells}
        >
          Reset
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={disabled || state.visibleCounts.included === 0}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.excludeAllCells}
          >
            Exclude all
          </Button>
          <Button
            disabled={disabled || state.visibleCounts.included === 0}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.excludeEdgeCells}
          >
            Edge exclude
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={disabled || !hasVisibleCells || state.variationExcludeLoading}
            loading={state.variationExcludeLoading}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void state.variationExclude()}
          >
            Var exclude
          </Button>
          <Button
            disabled={disabled || !hasVisibleCells || state.variationExcludeLoading}
            loading={state.variationExcludeLoading}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void state.autoExclude()}
          >
            Auto exclude
          </Button>
        </div>
      </SidebarSection>
      <VariationExcludeDialog
        state={state.variationExcludePreview}
        onApply={state.applyVariationExclude}
        onCancel={state.cancelVariationExclude}
        onThresholdChange={state.setVariationExcludeThreshold}
      />
    </>
  );
}
