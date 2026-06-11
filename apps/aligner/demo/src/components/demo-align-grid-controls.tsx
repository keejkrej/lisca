import { AlignGridRail } from "@lisca/ui/features";

import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignGridControls({ state }: { state: DemoAlignState }) {
  return <AlignGridRail disabled={!state.frame} grid={state.grid} onGridChange={state.setGrid} />;
}
