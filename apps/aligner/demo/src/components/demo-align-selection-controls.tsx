import { AlignSelectionCounts } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { Section } from "@lisca/ui/shell";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignSelectionControls({ state }: { state: DemoAlignState }) {
  const disabled = !state.frame;
  const hasExcludedCells = state.excludedCells.length > 0;

  return (
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
    </Section>
  );
}
