import { Button, Section } from "@lisca/ui";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
} from "@lisca/utils";
import { useMemo } from "react";

import type { AlignState } from "../state/use-align-state";
import { VariationExcludeDialog } from "./variation-exclude-dialog";

export function AlignSelectionControls({ state }: { state: AlignState }) {
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
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
            <div className="text-muted-foreground text-xs">Included cells</div>
            <div className="mt-1 font-medium tabular-nums">{state.visibleCounts.included}</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
            <div className="text-muted-foreground text-xs">Excluded cells</div>
            <div className="mt-1 font-medium tabular-nums">{state.visibleCounts.excluded}</div>
          </div>
        </div>
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
