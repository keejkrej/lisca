import { Button, Section } from "@lisca/ui";

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
