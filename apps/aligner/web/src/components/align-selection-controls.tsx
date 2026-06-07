import { AlignSelectionCounts } from "@lisca/ui/features";
import { Button } from "@lisca/ui";
import { Section } from "@lisca/ui/shell";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
} from "@lisca/utils";
import { useMemo } from "react";

import { useAlignPage } from "../state/align-page-context";
import { VariationExcludeDialog } from "./variation-exclude-dialog";

export function AlignSelectionControls() {
  const { state } = useAlignPage();
  const visibleCells = useMemo(
    () =>
      state.frame
        ? enumerateVisibleAlignGridCells(state.frame, state.grid).map(({ i, j }) => ({ i, j }))
        : [],
    [state.frame, state.grid],
  );
  const hasVisibleCells = visibleCells.length > 0;
  const hasExcludedCells = state.currentExcludedCells.length > 0;
  const disabled = state.cropping || !state.frame;

  return (
    <>
      <Section
        className="min-h-0 shrink-0"
        contentClassName="flex min-h-0 flex-col gap-2 overflow-auto"
        title="Selection"
      >
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
          onClick={() => state.setExcludedCellsForCurrentPosition([])}
        >
          Reset
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={disabled || !hasVisibleCells}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => state.setExcludedCellsForCurrentPosition(visibleCells)}
          >
            Exclude all
          </Button>
          <Button
            disabled={disabled || !hasVisibleCells}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              if (!state.frame) return;
              const edgeCells = collectAlignGridEdgeCells(state.frame, state.grid);
              state.setExcludedCellsForCurrentPosition(
                mergeExcludedAlignGridCells(state.currentExcludedCells, edgeCells),
              );
            }}
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
      </Section>
      <VariationExcludeDialog
        state={state.variationExcludePreview}
        onApply={state.applyVariationExclude}
        onCancel={state.cancelVariationExclude}
        onThresholdChange={state.setVariationExcludeThreshold}
      />
    </>
  );
}
